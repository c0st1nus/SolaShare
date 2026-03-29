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
  private clientsById = new Map<string, WSClient>();
  private userConnections = new Map<string, Set<string>>();

  private connectionToUser = new Map<string, string>();

  addClient(connectionId: string, userId: string, client: WSClient) {
    this.clientsById.set(connectionId, client);
    this.connectionToUser.set(connectionId, userId);
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    const connections = this.userConnections.get(userId);

    if (!connections) {
      return;
    }

    connections.add(connectionId);
  }

  removeClient(connectionId: string, userId: string) {
    this.clientsById.delete(connectionId);
    this.connectionToUser.delete(connectionId);
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.delete(connectionId);
      if (connections.size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }

  getUserIdForConnection(connectionId: string): string | undefined {
    return this.connectionToUser.get(connectionId);
  }

  broadcast(message: WebSocketMessage) {
    const payload = JSON.stringify(message);
    for (const [, client] of this.clientsById) {
      if (client.readyState === 1) client.send(payload);
    }
  }

  sendToUser(userId: string, message: WebSocketMessage) {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return;
    const payload = JSON.stringify(message);
    for (const connectionId of connectionIds) {
      const client = this.clientsById.get(connectionId);
      if (client?.readyState === 1) client.send(payload);
    }
  }
}

export const wsServer = new WebSocketServer();
export type { WebSocketMessage, WSClient };
