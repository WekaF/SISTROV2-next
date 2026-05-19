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

export function useDashboardStream(): UseDashboardStreamResult {
  const [data, setData] = useState<DashboardStreamData | null>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (esRef.current) {
        esRef.current.close();
      }

      setStatus("connecting");
      const es = new EventSource("/api/stream/dashboard");
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const parsed: DashboardStreamData = JSON.parse(event.data);
          setData(parsed);
          setStatus("live");
          setLastUpdated(new Date());
        } catch {
          // malformed payload — ignore this tick
        }
      };

      es.onerror = () => {
        setStatus("error");
        es.close();
        esRef.current = null;
        // Auto-reconnect after 5s
        retryTimeout = setTimeout(connect, 5_000);
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimeout);
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  return { data, status, lastUpdated };
}
