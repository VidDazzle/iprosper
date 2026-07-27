import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { loadEnv } from "@apex/config";

let connection: Redis | undefined;
const queues = new Map<string, Queue>();

export function getRedisConnection(): Redis {
  if (!connection) {
    const env = loadEnv();
    connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

export function getQueue(name: string): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: getRedisConnection() });
    queues.set(name, queue);
  }
  return queue;
}

export async function closeAllQueueConnections() {
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
  await connection?.quit();
  connection = undefined;
}

export const QUEUE_NAMES = {
  apexDispatch: "apex-dispatch",
  closerDispatch: "closer-dispatch",
  nurtureDispatch: "nurture-dispatch",
  ownerDigest: "owner-digest",
} as const;
