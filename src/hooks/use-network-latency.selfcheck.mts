// src/hooks/use-network-latency.selfcheck.mts
import assert from "node:assert/strict";
import { classifyNetworkStatus } from "./use-network-latency.ts";

// good: under 150ms
assert.equal(classifyNetworkStatus(0, true), "good");
assert.equal(classifyNetworkStatus(149, true), "good");

// slow: 150ms up to (not including) 500ms
assert.equal(classifyNetworkStatus(150, true), "slow");
assert.equal(classifyNetworkStatus(499, true), "slow");

// weak: 500ms or more, but the ping still succeeded and browser is online
assert.equal(classifyNetworkStatus(500, true), "weak");
assert.equal(classifyNetworkStatus(5000, true), "weak");

// offline: only when there's no measurement (fetch failed/timed out) or the
// browser itself reports no connection — never for a merely slow response
assert.equal(classifyNetworkStatus(null, true), "offline");
assert.equal(classifyNetworkStatus(20, false), "offline");
assert.equal(classifyNetworkStatus(5000, false), "offline");

console.log("use-network-latency self-check: all assertions passed");
