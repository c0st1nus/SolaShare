import Redis from "ioredis";
import { env } from "../config/env";

const redisUrl = env.REDIS_URL;

export const createRedisConnection = () =>
  new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

export const redis = createRedisConnection();

export default redis;
