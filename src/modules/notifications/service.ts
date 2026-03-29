import { eq } from "drizzle-orm";
import type { db } from "../../db";
import { holdingsSnapshots, notifications } from "../../db/schema";
import type { WSClient } from "../../lib/websocket";
import { wsServer } from "../../lib/websocket";
import type { Notification } from "./contracts";

type NotificationInsert = {
  type:
    | "investment_confirmed"
    | "revenue_posted"
    | "claim_available"
    | "sale_opened"
    | "sale_completed"
    | "asset_frozen"
    | "system";
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

type DbExecutor = Pick<typeof db, "insert" | "select">;

export class NotificationService {
  addClient(id: string, ws: WSClient) {
    wsServer.addClient(id, ws);
  }

  removeClient(id: string) {
    wsServer.removeClient(id);
  }

  broadcast(notification: Notification) {
    wsServer.broadcast(notification);
  }

  sendToUser(userId: string, notification: Notification) {
    wsServer.sendToUser(userId, notification);
  }

  async create(tx: DbExecutor, userId: string, payload: NotificationInsert) {
    await tx.insert(notifications).values({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      metadataJson: payload.metadata ?? null,
    });

    this.broadcast({
      type: this.toSocketType(payload.type),
      userId,
      data: {
        title: payload.title,
        body: payload.body,
        metadata: payload.metadata ?? null,
      },
      timestamp: Date.now(),
    });
  }

  async createForAssetUsers(tx: DbExecutor, assetId: string, payload: NotificationInsert) {
    const holders = await tx
      .select({
        userId: holdingsSnapshots.userId,
      })
      .from(holdingsSnapshots)
      .where(eq(holdingsSnapshots.assetId, assetId));

    const uniqueUserIds = [...new Set(holders.map((holder) => holder.userId))];

    if (uniqueUserIds.length === 0) {
      return;
    }

    for (const userId of uniqueUserIds) {
      await this.create(tx, userId, payload);
    }
  }

  private toSocketType(type: NotificationInsert["type"]): Notification["type"] {
    switch (type) {
      case "investment_confirmed":
        return "INVESTMENT_CONFIRMED";
      case "revenue_posted":
        return "EPOCH_CREATED";
      case "claim_available":
      case "sale_opened":
      case "sale_completed":
      case "asset_frozen":
      case "system":
        return "PAYMENT_RECEIVED";
    }
  }
}
