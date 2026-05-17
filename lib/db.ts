import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma =
  g.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  g.__prisma = prisma;
}
