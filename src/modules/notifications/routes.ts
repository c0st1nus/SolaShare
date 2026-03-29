import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { env } from "../../config/env";
import { db } from "../../db";
import { users } from "../../db/schema";
import { NotificationService } from "./service";

export const notificationsRoutes = new Elysia({ prefix: "/notifications" })
  .use(
    jwt({
      name: "jwt",
      secret: env.JWT_SECRET,
    }),
  )
  .ws("/ws", {
    query: t.Object({ token: t.String() }),
    open: async (ws) => {
      const { token } = ws.data.query;
      const payload = await ws.data.jwt.verify(token);

      if (!payload || !payload.sub) {
        ws.close(4001, "Unauthorized");
        return;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub as string))
        .limit(1);

      if (!user || user.status !== "active") {
        ws.close(4003, "Forbidden");
        return;
      }

      const service = new NotificationService();
      service.addClient(ws.id, user.id, ws);
    },
    message: (_ws, _message) => {
      // handle client messages if needed
    },
    close: (ws) => {
      const service = new NotificationService();
      const userId = service.getUserIdForConnection(ws.id);
      if (userId) {
        service.removeClient(ws.id, userId);
      }
    },
  });
