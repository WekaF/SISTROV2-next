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

export function useAntrianStream(companyCode?: string): UseAntrianStreamResult {
  const [data, setData]               = useState<AntrianStreamData | null>(null);
  const [status, setStatus]           = useState<AntrianStreamStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const esRef                         = useRef<EventSource | null>(null);
  const retryRef                      = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connect = () => {
      esRef.current?.close();
      setStatus("connecting");

      const url = companyCode
        ? `/api/stream/antrian?companyCode=${encodeURIComponent(companyCode)}`
        : "/api/stream/antrian";

      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const parsed: AntrianStreamData = JSON.parse(event.data);
          setData(parsed);
          setStatus("live");
          setLastUpdated(new Date());
        } catch {
          // malformed payload — ignore
        }
      };

      es.onerror = () => {
        setStatus("error");
        es.close();
        esRef.current = null;
        clearTimeout(retryRef.current ?? undefined);
        retryRef.current = setTimeout(connect, 5_000);
      };
    };

    connect();

    return () => {
      clearTimeout(retryRef.current ?? undefined);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [companyCode]);

  return { data, status, lastUpdated };
}
