#!/usr/bin/env node
import { performance } from "node:perf_hooks";

const baseUrl = (process.env.LOAD_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const endpoint = process.env.LOAD_ENDPOINT || "/api/health/live";
const concurrency = Math.max(1, Math.min(200, Number(process.env.LOAD_CONCURRENCY) || 50));
// The release gate models the agreed 50 simultaneously active clients. One
// request per worker keeps the default run from becoming a 250-request burst
// from the same loopback IP, which correctly exercises the abuse limiter
// instead of measuring normal concurrency. Set LOAD_REQUESTS_PER_WORKER when a
// separate sustained/rate-limit test is intended.
const requestsPerWorker = Math.max(
  1,
  Math.min(100, Number(process.env.LOAD_REQUESTS_PER_WORKER) || 1),
);
const timeoutMs = Math.max(250, Number(process.env.LOAD_TIMEOUT_MS) || 5_000);
const timings = [];
let failures = 0;

async function request() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) failures += 1;
    await response.arrayBuffer();
  } catch {
    failures += 1;
  } finally {
    timings.push(performance.now() - startedAt);
    clearTimeout(timeout);
  }
}

await Promise.all(
  Array.from({ length: concurrency }, async () => {
    for (let index = 0; index < requestsPerWorker; index += 1) await request();
  }),
);

timings.sort((left, right) => left - right);
const percentile = (value) =>
  timings[Math.min(timings.length - 1, Math.ceil(timings.length * value) - 1)];
const report = {
  target: `${baseUrl}${endpoint}`,
  concurrency,
  requests: timings.length,
  failures,
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  p99Ms: Math.round(percentile(0.99)),
  maxMs: Math.round(timings.at(-1) || 0),
};
console.info(JSON.stringify(report, null, 2));
if (failures > 0 || report.p95Ms >= 1_000) process.exitCode = 1;
