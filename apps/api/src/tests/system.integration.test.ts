import { afterEach, describe, expect, it } from "bun:test";
import { db } from "../db";
import { redis } from "../lib/redis";
import { apiRequest } from "./helpers";

describe("system integration", () => {
  const originalFetch = globalThis.fetch;
  const originalDbExecute = db.execute.bind(db);
  const originalRedisPing = redis.ping.bind(redis);

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.assign(db, {
      execute: originalDbExecute,
    });
    Object.assign(redis, {
      ping: originalRedisPing,
    });
  });

  it("returns 200 for health", async () => {
    const { response, json } = await apiRequest({
      method: "GET",
      path: "/api/v1/health",
    });

    expect(response.status).toBe(200);
    expect(json?.status).toBe("ok");
  });

  it("returns ready when dependencies are available", async () => {
    globalThis.fetch = (async () =>
      new Response("ok", {
        status: 200,
      })) as unknown as typeof globalThis.fetch;

    const { response, json } = await apiRequest({
      method: "GET",
      path: "/api/v1/ready",
    });

    expect(response.status).toBe(200);
    expect(json?.status).toBe("ready");
  });

  it("returns degraded when Redis readiness fails", async () => {
    globalThis.fetch = (async () =>
      new Response("ok", {
        status: 200,
      })) as unknown as typeof globalThis.fetch;

    Object.assign(redis, {
      ping: async () => {
        throw new Error("redis unavailable");
      },
    });

    const { response, json } = await apiRequest({
      method: "GET",
      path: "/api/v1/ready",
    });

    expect(response.status).toBe(503);
    expect(json?.status).toBe("degraded");
    expect(json?.dependencies).toMatchObject({
      redis: "failed",
    });
  });
});
