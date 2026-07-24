import { PrismaClient } from "../generated/client";

declare global {
  // eslint-disable-next-line no-var
  var __apexPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__apexPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__apexPrisma = prisma;
}

export * from "../generated/client";
