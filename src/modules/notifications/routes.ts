import { Elysia } from "elysia";
import { NotificationService } from "./service";

export const notificationsRoutes = new Elysia({ prefix: "/notifications" }).ws("/ws", {
  open: (ws) => {
    const service = new NotificationService();
    service.addClient(ws.id, ws);
  },
  message: (_ws, _message) => {
    // handle client messages if needed
  },
  close: (ws) => {
    const service = new NotificationService();
    service.removeClient(ws.id);
  },
});
