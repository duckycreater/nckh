/**
 * stream.ts — Server-Sent Events feed.
 *
 * Provides a single endpoint:
 *   GET /api/stream/feed
 *
 * Events pushed:
 *   - "scan"          { region, category, when }     (anonymized new scan)
 *   - "fl_round"      { round, accuracy, epsilon }  (FL round completed)
 *   - "smart_bin"     { binId, fillPercent }        (smart bin threshold)
 *
 * We use a Node EventEmitter as the in-process bus. For production
 * you'd swap to Redis pub/sub; the interface stays identical.
 */

import { Router } from "express";
import { EventEmitter } from "events";
import { federatedAggregator } from "../services/federatedAggregator.js";

/* Singleton bus shared across the app. */
export const sseBus = new EventEmitter();
sseBus.setMaxListeners(100);

export function streamRouter(): Router {
  const router = Router();

  router.get("/feed", (req, res) => {
    // SSE headers
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering if present
    });
    res.flushHeaders();

    // Initial comment to establish the stream with EventSource clients.
    res.write(": bmo-sse-feed\n\n");

    const send = (event: string, data: unknown) => {
      try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch {
        // client gone
      }
    };

    const onScan = (payload: unknown) => send("scan", payload);
    const onFlRound = (payload: unknown) => send("fl_round", payload);
    const onSmartBin = (payload: unknown) => send("smart_bin", payload);
    const onHeartbeat = () => res.write(`: ping\n\n`);

    sseBus.on("scan", onScan);
    sseBus.on("fl_round", onFlRound);
    sseBus.on("smart_bin", onSmartBin);
    const hb = setInterval(onHeartbeat, 25_000);

    // Cleanup on disconnect
    req.on("close", () => {
      sseBus.off("scan", onScan);
      sseBus.off("fl_round", onFlRound);
      sseBus.off("smart_bin", onSmartBin);
      clearInterval(hb);
    });

    // Send a hello event so the client knows the stream is open.
    send("hello", {serverTime: Date.now()});

    // Announce latest FL round right away so UI doesn't wait for next event.
    try {
      const latest = federatedAggregator.getLatestVersion();
      if (latest) {
        send("fl_round", {
          round: latest.version,
          trainedOn: latest.trainedOn,
          accuracy: Object.values(latest.scores || {})[0] ?? null,
        });
      }
    } catch {
      // best-effort
    }
  });

  return router;
}