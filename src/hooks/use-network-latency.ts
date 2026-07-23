"use client";
import { useEffect, useState } from "react";

export type NetworkStatus = "good" | "slow" | "weak" | "offline";

export interface NetworkLatencyState {
  status: NetworkStatus;
  latencyMs: number | null;
}

const POLL_INTERVAL_MS = 20_000;
const FETCH_TIMEOUT_MS = 3_000;
const GOOD_THRESHOLD_MS = 150;
const SLOW_THRESHOLD_MS = 500;

export function classifyNetworkStatus(
  latencyMs: number | null,
  isOnline: boolean
): NetworkStatus {
  if (!isOnline || latencyMs === null) return "offline";
  if (latencyMs < GOOD_THRESHOLD_MS) return "good";
  if (latencyMs < SLOW_THRESHOLD_MS) return "slow";
  return "weak";
}

async function measurePingLatency(): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = performance.now();
  try {
    const res = await fetch("/api/ping", { cache: "no-store", signal: controller.signal });
    if (!res.ok) return null;
    return performance.now() - start;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function useNetworkLatency(): NetworkLatencyState {
  const [state, setState] = useState<NetworkLatencyState>({ status: "good", latencyMs: null });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const latencyMs = await measurePingLatency();
      if (!cancelled) {
        setState({ latencyMs, status: classifyNetworkStatus(latencyMs, true) });
      }
    }

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);

    // Re-check via ping on any connectivity event rather than trusting the
    // navigator.onLine flag — on LAN-only networks (no internet route) the
    // browser reports offline even though the app server is reachable.
    function handleOnline() {
      check();
    }
    function handleOffline() {
      check();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return state;
}
