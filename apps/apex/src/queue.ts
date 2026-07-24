import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { loadEnv } from "@apex/config";

let connection: Redis | undefined;
let dispatchQueue: Queue | undefined;

export function getRedisConnection(): Redis {
  if (!connection) {
    const env = loadEnv();
    connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

/** Sub-agent workers (Phase 2: apps/worker) consume from this queue. */
export function getDispatchQueue(): Queue {
  if (!dispatchQueue) {
    dispatchQueue = new Queue("apex-dispatch", { connection: getRedisConnection() });
  }
  return dispatchQueue;
}

export async function closeQueueConnections() {
  await dispatchQueue?.close();
  await connection?.quit();
  dispatchQueue = undefined;
  connection = undefined;
}
