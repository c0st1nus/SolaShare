type RelayQueuePayload = Record<string, unknown>;

interface RelayQueueJob {
  id: string;
}

interface RelayQueue {
  add(name: string, data: RelayQueuePayload): Promise<RelayQueueJob>;
}

// Temporary fallback until Redis-backed BullMQ wiring is enabled.
export const relayQueue: RelayQueue = {
  async add(name, data) {
    console.log("[MOCK] Would add to queue:", name, data);
    return { id: `mock-${Date.now()}` };
  },
};
