interface WSClient {
  send(data: string): void;
  readyState: number;
}

type WebSocketMessage =
  | null
  | boolean
  | number
  | string
  | WebSocketMessage[]
  | { [key: string]: WebSocketMessage };

class WebSocketServer {
  private clients = new Map<string, WSClient>();

  addClient(id: string, client: WSClient) {
    this.clients.set(id, client);
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  broadcast(message: WebSocketMessage) {
    const payload = JSON.stringify(message);
    for (const [, client] of this.clients) {
      if (client.readyState === 1) client.send(payload);
    }
  }

  sendToUser(userId: string, message: WebSocketMessage) {
    const client = this.clients.get(userId);
    if (client?.readyState === 1) client.send(JSON.stringify(message));
  }
}

export const wsServer = new WebSocketServer();
export type { WebSocketMessage, WSClient };
