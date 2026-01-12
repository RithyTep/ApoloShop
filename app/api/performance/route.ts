import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  logPerformanceMetric,
  logError,
  getPerformanceSummary,
  getRecentErrors,
  resolveError,
  resolveErrorsByFingerprint,
  getWebVitalRating,
  type WebVitalName,
  WEB_VITAL_THRESHOLDS,
} from "@/lib/performance";

/**
 * POST /api/performance - Log performance metrics from client
 * Accepts Core Web Vitals, API timing, and error reports
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, metrics, error } = body;

    // Get user/session context from headers
    const userAgent = request.headers.get("user-agent") || undefined;
    const sessionId = request.headers.get("x-session-id") || undefined;
    const userId = request.headers.get("x-user-id") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0].trim() || realIp || undefined;

    // Detect device type from user agent
    const deviceType = userAgent
      ? /mobile/i.test(userAgent)
        ? "mobile"
        : /tablet/i.test(userAgent)
          ? "tablet"
          : "desktop"
      : undefined;

    if (type === "web-vitals" && metrics) {
      // Log Core Web Vitals
      const promises = metrics.map(
        (metric: { name: string; value: number; path?: string }) => {
          const name = metric.name as WebVitalName;
          const rating =
            name in WEB_VITAL_THRESHOLDS
              ? getWebVitalRating(name, metric.value)
              : undefined;

          return logPerformanceMetric({
            type: "WEB_VITAL",
            name: metric.name,
            value: metric.value,
            rating,
            path: metric.path,
            sessionId,
            userId,
            deviceType,
            userAgent,
          });
        }
      );

      await Promise.all(promises);
      return NextResponse.json({ success: true, logged: metrics.length });
    }

    if (type === "error" && error) {
      // Log client-side error
      await logError({
        message: error.message || "Unknown error",
        stack: error.stack,
        name: error.name,
        path: error.path,
        sessionId,
        userId,
        deviceType,
        userAgent,
        ipAddress,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
  } catch (err) {
    console.error("[Performance API] Error:", err);
    return NextResponse.json(
      { error: "Failed to log metric" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/performance - Get performance summary for admin dashboard
 * Query params: startDate, endDate
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const dateRange =
      startDateStr || endDateStr
        ? {
            startDate: startDateStr ? new Date(startDateStr) : undefined,
            endDate: endDateStr ? new Date(endDateStr) : undefined,
          }
        : undefined;

    const summary = await getPerformanceSummary(dateRange);

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[Performance API] Error:", err);
    return NextResponse.json(
      { error: "Failed to get performance data" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/performance - Resolve errors
 * Body: { errorId, fingerprint, resolvedBy }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { errorId, fingerprint, resolvedBy } = body;

    if (fingerprint) {
      // Resolve all errors with same fingerprint
      const count = await resolveErrorsByFingerprint(fingerprint, resolvedBy);
      return NextResponse.json({ success: true, resolved: count });
    }

    if (errorId) {
      await resolveError(errorId, resolvedBy);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "errorId or fingerprint required" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[Performance API] Error:", err);
    return NextResponse.json(
      { error: "Failed to resolve error" },
      { status: 500 }
    );
  }
}
