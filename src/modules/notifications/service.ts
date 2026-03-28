import type { WSClient } from "../../lib/websocket";
import { wsServer } from "../../lib/websocket";
import type { Notification } from "./contracts";

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
}
