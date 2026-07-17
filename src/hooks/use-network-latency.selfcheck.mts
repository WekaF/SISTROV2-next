// src/hooks/use-network-latency.selfcheck.mts
import assert from "node:assert/strict";
import { classifyNetworkStatus } from "./use-network-latency.ts";

// good: under 150ms
assert.equal(classifyNetworkStatus(0, true), "good");
assert.equal(classifyNetworkStatus(149, true), "good");

// slow: 150ms up to (not including) 500ms
assert.equal(classifyNetworkStatus(150, true), "slow");
assert.equal(classifyNetworkStatus(499, true), "slow");

// offline: 500ms or more, or no measurement, or browser reports offline
assert.equal(classifyNetworkStatus(500, true), "offline");
assert.equal(classifyNetworkStatus(null, true), "offline");
assert.equal(classifyNetworkStatus(20, false), "offline");

console.log("use-network-latency self-check: all assertions passed");
