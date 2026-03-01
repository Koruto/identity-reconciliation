import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

let _prisma: PrismaClient;

export async function initPrisma(): Promise<PrismaClient> {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const filePath = url.startsWith("file:") ? url.slice(5) : url;
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const factory = new PrismaBetterSqlite3({ url: absolutePath });
  const client = new PrismaClient({
    adapter: factory,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  _prisma = client;
  return client;
}

export function getPrisma(): PrismaClient {
  if (!_prisma) throw new Error("Prisma not initialized. Call initPrisma() first.");
  return _prisma;
}
