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

export function useDashboardStream(
  period: string = "today",
  month?: number,
  year?: number
): UseDashboardStreamResult {
  const [data, setData] = useState<DashboardStreamData | null>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set("period", period);
        if (month !== undefined) queryParams.set("month", String(month));
        if (year !== undefined) queryParams.set("year", String(year));

        const res = await fetch(`/api/stream/dashboard?${queryParams.toString()}`);
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
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [period, month, year]);

  return { data, status, lastUpdated };
}
