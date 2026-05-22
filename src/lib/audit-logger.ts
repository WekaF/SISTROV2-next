import { prismaLog } from "@/lib/prisma";

export type AuditEventType =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "COMPANY_SWITCH"
  | "API_CALL";

interface LogEventData {
  eventType: AuditEventType;
  userId?: string;
  username?: string;
  role?: string;
  companyCode?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

export async function logEvent(data: LogEventData): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prismaLog.auditLog.create({ data: data as any });
  } catch (err) {
    console.error("[audit-logger] failed to write log:", err);
  }
}
