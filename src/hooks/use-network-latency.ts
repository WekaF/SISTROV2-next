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
  // ponytail: XHR instead of fetch — Chrome blocks fetch() on LAN-only networks
  // (navigator.onLine=false / no internet route) even for same-origin requests;
  // XHR bypasses that flag. Upgrade to fetch if Chrome fixes this behaviour.
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const start = performance.now();
    const timer = setTimeout(() => { xhr.abort(); resolve(null); }, FETCH_TIMEOUT_MS);
    xhr.open("GET", "/api/ping?_=" + start, true);
    xhr.onload = () => { clearTimeout(timer); resolve(xhr.status < 400 ? performance.now() - start : null); };
    xhr.onerror = () => { clearTimeout(timer); resolve(null); };
    xhr.onabort = () => { clearTimeout(timer); resolve(null); };
    xhr.send();
  });
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
