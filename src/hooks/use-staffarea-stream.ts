"use client";

import { useEffect, useRef, useState } from "react";

export type StreamStatus = "connecting" | "live" | "error";

interface UseStaffAreaStreamResult {
  data: any | null;
  status: StreamStatus;
  lastUpdated: Date | null;
}

const POLL_INTERVAL_MS = 30_000;

export function useStaffAreaStream(companyCode: string | null): UseStaffAreaStreamResult {
  const [data, setData] = useState<any | null>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const url = companyCode
      ? `/api/stream/staffarea?companyCode=${encodeURIComponent(companyCode)}`
      : "/api/stream/staffarea";

    const fetchData = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const parsed = await res.json();
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
