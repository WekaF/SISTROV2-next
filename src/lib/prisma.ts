import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaLog: PrismaClient | undefined;
};

const connectionString = process.env.LOG_DATABASE_URL || "postgresql://postgres:admin@localhost:5432/sistro_logs";

export const prismaLog =
  globalForPrisma.prismaLog ??
  (() => {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  })();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaLog = prismaLog;
}
