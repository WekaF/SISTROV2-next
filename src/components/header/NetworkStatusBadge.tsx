"use client";
import { Wifi, WifiOff } from "lucide-react";
import { useNetworkLatency } from "@/hooks/use-network-latency";

const STATUS_STYLES: Record<string, string> = {
  good: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  slow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  offline: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

export default function NetworkStatusBadge() {
  const { status, latencyMs } = useNetworkLatency();

  const label =
    status === "offline" ? "Offline" : latencyMs !== null ? `${Math.round(latencyMs)}ms` : "…";
  const Icon = status === "offline" ? WifiOff : Wifi;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[status]}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
