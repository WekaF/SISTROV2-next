"use client";

import { useEffect, useRef, useState } from "react";

export type StreamStatus = "connecting" | "live" | "error";

interface UseStaffAreaStreamResult {
  data: any | null;
  status: StreamStatus;
  lastUpdated: Date | null;
}

export function useStaffAreaStream(companyCode: string | null): UseStaffAreaStreamResult {
  const [data, setData] = useState<any | null>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connect = () => {
      if (esRef.current) {
        esRef.current.close();
      }

      setStatus("connecting");

      const url = companyCode
        ? `/api/stream/staffarea?companyCode=${encodeURIComponent(companyCode)}`
        : "/api/stream/staffarea";

      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
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
        clearTimeout(retryTimeoutRef.current ?? undefined);
        // Auto-reconnect after 5s
        retryTimeoutRef.current = setTimeout(connect, 5_000);
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimeoutRef.current ?? undefined);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [companyCode]);

  return { data, status, lastUpdated };
}
