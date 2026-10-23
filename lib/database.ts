import { PrismaClient } from "@prisma/client";

import { env } from "@/env.mjs";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: env.NODE_ENV === "development"
      ? [{ emit: "event", level: "query" }, "error", "warn"]
      : ["error"],
  });

  if (env.NODE_ENV === "development") {
    client.$on("query", (event) => {
      const operation = event.query.trimStart().split(/\s+/, 1)[0]?.toUpperCase() ?? "QUERY";
      const table = event.query.match(/"public"\."([^"]+)"/)?.[1] ?? "database";
      console.info(`[db:timing] ${operation} ${table} ${event.duration}ms`);
    });
  }

  return client;
}

export const prisma =
  globalForPrisma.prisma ||
  createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
