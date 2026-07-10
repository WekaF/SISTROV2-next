"use client";

import { useEffect, useRef, useState } from "react";

export type AntrianStreamStatus = "connecting" | "live" | "error";

export interface AntrianStreamData {
  total: number;
  securityIn: number;
  securityOut: number;
  jembatanTimbang: number;
  timbangKosong: number;
  timbangIsi: number;
  sedangMuat: number;
  selesaiMuat: number;
  warehouseCounts?: Record<string, number>;
  timestamp: number;
}

interface UseAntrianStreamResult {
  data: AntrianStreamData | null;
  status: AntrianStreamStatus;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 30_000;

export function useAntrianStream(companyCode?: string): UseAntrianStreamResult {
  const [data, setData]               = useState<AntrianStreamData | null>(null);
  const [status, setStatus]           = useState<AntrianStreamStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  const url = companyCode
    ? `/api/stream/antrian?companyCode=${encodeURIComponent(companyCode)}`
    : "/api/stream/antrian";

  const refresh = async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed: AntrianStreamData = await res.json();
      setData(parsed);
      setStatus("live");
      setLastUpdated(new Date());
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [url]);

  return { data, status, lastUpdated, refresh };
}
