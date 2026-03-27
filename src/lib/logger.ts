import pino from "pino";

export const logger = pino({
  name: "solashare-api",
  level: Bun.env.LOG_LEVEL ?? "info",
});
