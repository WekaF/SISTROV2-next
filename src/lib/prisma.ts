import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaLog: PrismaClient | undefined;
};

export const prismaLog =
  globalForPrisma.prismaLog ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaLog = prismaLog;
}
