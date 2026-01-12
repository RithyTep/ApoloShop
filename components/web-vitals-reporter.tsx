"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

// Web Vital metric types
interface WebVitalMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType: string;
}

// Queue to batch metrics before sending
const metricsQueue: { name: string; value: number; path: string }[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Flush queued metrics to the server
 */
async function flushMetrics() {
  if (metricsQueue.length === 0) return;

  const metrics = [...metricsQueue];
  metricsQueue.length = 0;

  try {
    await fetch("/api/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "web-vitals", metrics }),
    });
  } catch (error) {
    console.error("[WebVitals] Failed to report metrics:", error);
  }
}

/**
 * Queue a metric for batch reporting
 */
function queueMetric(name: string, value: number, path: string) {
  metricsQueue.push({ name, value, path });

  // Debounce flush - wait 5 seconds for more metrics
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = setTimeout(flushMetrics, 5000);
}

/**
 * Report error to the server
 */
async function reportError(error: {
  message: string;
  stack?: string;
  name?: string;
  path?: string;
}) {
  try {
    await fetch("/api/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "error", error }),
    });
  } catch (err) {
    console.error("[WebVitals] Failed to report error:", err);
  }
}

/**
 * WebVitalsReporter - Reports Core Web Vitals and errors
 *
 * Features:
 * - Captures LCP, FID/INP, CLS, FCP, TTFB
 * - Batches metrics for efficient reporting
 * - Global error boundary (catches unhandled errors)
 * - Only runs in production by default
 */
export function WebVitalsReporter({
  enabled = process.env.NODE_ENV === "production",
}: {
  enabled?: boolean;
}) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // Keep pathname ref updated
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Handle Web Vital metric
  const handleMetric = useCallback((metric: WebVitalMetric) => {
    const { name, value } = metric;
    queueMetric(name, value, pathnameRef.current);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Dynamically import web-vitals for code splitting
    let cleanup: (() => void) | undefined;

    import("web-vitals").then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
      // Observe all Core Web Vitals
      onCLS(handleMetric);
      onFCP(handleMetric);
      onLCP(handleMetric);
      onTTFB(handleMetric);
      onINP(handleMetric);
    }).catch((err) => {
      console.error("[WebVitals] Failed to load web-vitals:", err);
    });

    // Global error handler for unhandled errors
    const handleGlobalError = (event: ErrorEvent) => {
      reportError({
        message: event.message,
        stack: event.error?.stack,
        name: event.error?.name,
        path: pathnameRef.current,
      });
    };

    // Global handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      reportError({
        message: error?.message || "Unhandled Promise Rejection",
        stack: error?.stack,
        name: error?.name || "UnhandledRejection",
        path: pathnameRef.current,
      });
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // Flush metrics when page is hidden (user leaving)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushMetrics();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    cleanup = () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushMetrics(); // Flush remaining metrics on unmount
      }
    };

    return cleanup;
  }, [enabled, handleMetric]);

  return null; // This component doesn't render anything
}

/**
 * Hook to manually report errors
 */
export function useErrorReporter() {
  const pathname = usePathname();

  return useCallback(
    (error: Error | string, context?: Record<string, unknown>) => {
      const errorObj =
        typeof error === "string"
          ? { message: error, name: "Error", stack: undefined }
          : { message: error.message, name: error.name, stack: error.stack };

      reportError({
        ...errorObj,
        path: pathname,
      });
    },
    [pathname]
  );
}

/**
 * Hook to manually report Web Vitals or custom metrics
 */
export function useMetricReporter() {
  const pathname = usePathname();

  return useCallback(
    (name: string, value: number) => {
      queueMetric(name, value, pathname);
    },
    [pathname]
  );
}
