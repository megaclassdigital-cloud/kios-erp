"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `refresh` every `intervalMs` while the tab is visible, and straight away
 * when the tab becomes visible again or the window regains focus -- so a
 * screen left open on a tablet shows the sale that just happened at the till
 * without anyone pressing reload. Paused while hidden (no needless requests).
 *
 * This is polling, not a push connection: numbers are at most `intervalMs`
 * behind, which is plenty for a shop and needs no extra infrastructure.
 */
export function useAutoRefresh(refresh: () => void | Promise<void>, intervalMs = 15_000) {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  }, [refresh]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const run = () => void latest.current();
    const start = () => {
      if (timer === null) timer = setInterval(run, intervalMs);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        run();
        start();
      } else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", run);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", run);
    };
  }, [intervalMs]);
}
