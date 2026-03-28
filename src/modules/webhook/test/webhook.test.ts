import { describe, expect, it } from "bun:test";
import { WebhookService } from "../service";

describe("WebhookService", () => {
  it("should handle valid webhook", async () => {
    const service = new WebhookService();
    const result = await service.handleHeliusWebhook({
      signature: "test",
      timestamp: Date.now(),
      events: { transfer: [{ from: "a", to: "b", amount: 100, mint: "sol" }] },
      memo: "test_memo",
    });
    expect(result.handled).toBe(true);
  });
});
