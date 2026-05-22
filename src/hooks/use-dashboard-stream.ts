"use client";

import { useEffect, useRef, useState } from "react";

export type StreamStatus = "connecting" | "live" | "error";

export interface DashboardStreamData {
  stats: any;
  trendPlant: any;
  trendHour: any;
  durasi: any;
  monthly: any;
  leaderboard: any;
  durasiTickets: any;
  topProduk: any;
  mapData: any;
}

interface UseDashboardStreamResult {
  data: DashboardStreamData | null;
  status: StreamStatus;
  lastUpdated: Date | null;
}

const POLL_INTERVAL_MS = 30_000;

export function useDashboardStream(): UseDashboardStreamResult {
  const [data, setData] = useState<DashboardStreamData | null>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/stream/dashboard");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const parsed: DashboardStreamData = await res.json();
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
  }, []);

  return { data, status, lastUpdated };
}
