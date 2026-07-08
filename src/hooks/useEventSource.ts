/**
 * useEventSource.ts — React hook for Server-Sent Events.
 *
 * Auto-reconnects with exponential backoff (capped at 30s) and
 * surfaces the last-seen timestamp + connection status so the UI
 * can render a small "Live" badge.
 */

import { useEffect, useRef, useState } from "react";

export type SSEStatus = "connecting" | "open" | "closed" | "error";

export interface SSEEvent<T = unknown> {
  type: string;
  data: T;
  ts: number;
}

interface Options {
  enabled?: boolean;
  onEvent?: (ev: SSEEvent) => void;
  withCredentials?: boolean;
}

export function useEventSource<T = unknown>(url: string | null, opts: Options = {}) {
  const {enabled = true, onEvent, withCredentials = false} = opts;
  const [status, setStatus] = useState<SSEStatus>("connecting");
  const [last, setLast] = useState<SSEEvent<T> | null>(null);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !url) return;
    let es: EventSource | null = null;
    let backoff = 1000;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setStatus("connecting");
      try {
        es = new EventSource(url, {withCredentials});
      } catch (e) {
        setStatus("error");
        scheduleReconnect();
        return;
      }
      es.onopen = () => {
        setStatus("open");
        backoff = 1000;
      };
      es.onerror = () => {
        setStatus("error");
        es?.close();
        scheduleReconnect();
      };
      // Wire common event names — server sends named events.
      const named: any[] = ["scan", "fl_round", "smart_bin", "hello"];
      named.forEach((name) => {
        es!.addEventListener(name as string, (ev: MessageEvent) => {
          let data: T;
          try {
            data = JSON.parse(ev.data) as T;
          } catch {
            data = ev.data as unknown as T;
          }
          const event: SSEEvent<T> = {type: String(name), data, ts: Date.now()};
          setLast(event);
          handlerRef.current?.(event);
        });
      });
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      const wait = Math.min(backoff, 30_000);
      backoff = Math.min(backoff * 2, 30_000);
      setTimeout(connect, wait);
    };

    connect();
    return () => {
      cancelled = true;
      es?.close();
      setStatus("closed");
    };
  }, [url, enabled, withCredentials]);

  return {status, last};
}