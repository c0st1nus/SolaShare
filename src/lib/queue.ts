import { Queue, Worker } from "bullmq";
import { settlementService } from "../modules/transactions/settlement-service";
import { logger } from "./logger";
import { createRedisConnection } from "./redis";

type RelayQueuePayload = Record<string, unknown>;

interface RelayQueueJob {
  id: string;
}

interface RelayQueue {
  add(name: string, data: RelayQueuePayload): Promise<RelayQueueJob>;
}

let queue: Queue<RelayQueuePayload> | null = null;
let worker: Worker<RelayQueuePayload> | null = null;

const getQueue = () => {
  if (!queue) {
    queue = new Queue<RelayQueuePayload>("relay", {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
  }

  return queue;
};

export const relayQueue: RelayQueue = {
  async add(name, data) {
    const job = await getQueue().add(name, data);
    return { id: job.id ?? crypto.randomUUID() };
  },
};

export const startRelayWorkers = async () => {
  if (worker) {
    return;
  }

  worker = new Worker<RelayQueuePayload>(
    "relay",
    async (job) => {
      switch (job.name) {
        case "confirm-investment":
          return settlementService.runQueuedInvestmentConfirmation(
            String(job.data.investmentId),
            String(job.data.txSignature),
          );
        default:
          throw new Error(`Unknown relay job: ${job.name}`);
      }
    },
    {
      connection: createRedisConnection(),
    },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, name: job.name }, "Relay job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, name: job?.name, error }, "Relay job failed");
  });
};
