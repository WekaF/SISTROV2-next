"use client";

import { useEffect, useRef, useState } from "react";

export type AntrianStreamStatus = "connecting" | "live" | "error";

export interface AntrianStreamData {
  total: number;
  timestamp: number;
}

interface UseAntrianStreamResult {
  data: AntrianStreamData | null;
  status: AntrianStreamStatus;
  lastUpdated: Date | null;
}

const POLL_INTERVAL_MS = 30_000;

export function useAntrianStream(companyCode?: string): UseAntrianStreamResult {
  const [data, setData]               = useState<AntrianStreamData | null>(null);
  const [status, setStatus]           = useState<AntrianStreamStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const url = companyCode
      ? `/api/stream/antrian?companyCode=${encodeURIComponent(companyCode)}`
      : "/api/stream/antrian";

    const fetchData = async () => {
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

    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [companyCode]);

  return { data, status, lastUpdated };
}
