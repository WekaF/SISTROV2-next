export type NotificationType =
  | "POSTO_BARU"
  | "ARMADA_APPROVED"
  | "ARMADA_REJECTED"
  | "ARMADA_BLOCKED"
  | "ARMADA_UNBLOCKED"
  | "PENGAJUAN_BARU";

export interface NotificationDTO {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface SyncSession {
  username: string;
  companyCode: string | null;
  aspnetToken: string;
}
