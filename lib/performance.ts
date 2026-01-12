import { prisma } from "@/lib/prisma";
import type { MetricType } from "@prisma/client";

// Core Web Vital thresholds (in milliseconds)
export const WEB_VITAL_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 }, // First Input Delay
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift (unitless)
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint
} as const;

export type WebVitalName = keyof typeof WEB_VITAL_THRESHOLDS;

/**
 * Get rating for a Core Web Vital metric
 */
export function getWebVitalRating(
  name: WebVitalName,
  value: number
): "good" | "needs-improvement" | "poor" {
  const threshold = WEB_VITAL_THRESHOLDS[name];
  if (!threshold) return "needs-improvement";

  if (value <= threshold.good) return "good";
  if (value > threshold.poor) return "poor";
  return "needs-improvement";
}

export interface PerformanceMetricInput {
  type: MetricType;
  name: string;
  value: number;
  rating?: string;
  path?: string;
  method?: string;
  sessionId?: string;
  userId?: string;
  deviceType?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

/**
 * Log a performance metric to the database
 * Non-blocking - fire and forget pattern
 */
export async function logPerformanceMetric(
  input: PerformanceMetricInput
): Promise<void> {
  try {
    await prisma.performanceMetric.create({
      data: {
        type: input.type,
        name: input.name,
        value: input.value,
        rating: input.rating,
        path: input.path,
        method: input.method,
        sessionId: input.sessionId,
        userId: input.userId,
        deviceType: input.deviceType,
        userAgent: input.userAgent,
        details: input.details,
      },
    });
  } catch (error) {
    // Log error but don't throw - performance logging should not break the main operation
    console.error("[Performance] Failed to log metric:", error);
  }
}

/**
 * Log a Core Web Vital metric
 */
export async function logWebVital(
  name: WebVitalName,
  value: number,
  context?: {
    path?: string;
    sessionId?: string;
    userId?: string;
    deviceType?: string;
    userAgent?: string;
  }
): Promise<void> {
  const rating = getWebVitalRating(name, value);
  await logPerformanceMetric({
    type: "WEB_VITAL",
    name,
    value,
    rating,
    ...context,
  });
}

/**
 * Log API response time
 */
export async function logApiResponseTime(
  path: string,
  method: string,
  durationMs: number,
  context?: {
    sessionId?: string;
    userId?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  // Rating based on response time
  let rating: string;
  if (durationMs <= 100) rating = "good";
  else if (durationMs <= 500) rating = "needs-improvement";
  else rating = "poor";

  await logPerformanceMetric({
    type: "API_RESPONSE",
    name: path,
    value: durationMs,
    rating,
    path,
    method,
    ...context,
  });
}

/**
 * Log database query performance
 */
export async function logDatabaseQuery(
  queryName: string,
  durationMs: number,
  context?: {
    path?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  // Rating based on query time
  let rating: string;
  if (durationMs <= 50) rating = "good";
  else if (durationMs <= 200) rating = "needs-improvement";
  else rating = "poor";

  await logPerformanceMetric({
    type: "DATABASE_QUERY",
    name: queryName,
    value: durationMs,
    rating,
    ...context,
  });
}

export interface ErrorLogInput {
  message: string;
  stack?: string;
  name?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  sessionId?: string;
  userId?: string;
  requestBody?: Record<string, unknown>;
  requestHeaders?: Record<string, unknown>;
  deviceType?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Generate error fingerprint for grouping similar errors
 */
function generateErrorFingerprint(input: ErrorLogInput): string {
  // Create fingerprint from error name, message pattern, and path
  const parts = [
    input.name || "Error",
    input.message.substring(0, 100).replace(/[0-9]+/g, "N"), // Normalize numbers
    input.path || "unknown",
    input.method || "unknown",
  ];
  return parts.join("|");
}

/**
 * Log an error to the database
 */
export async function logError(input: ErrorLogInput): Promise<void> {
  try {
    const fingerprint = generateErrorFingerprint(input);

    await prisma.errorLog.create({
      data: {
        message: input.message,
        stack: input.stack,
        name: input.name,
        path: input.path,
        method: input.method,
        statusCode: input.statusCode,
        sessionId: input.sessionId,
        userId: input.userId,
        requestBody: input.requestBody,
        requestHeaders: input.requestHeaders,
        deviceType: input.deviceType,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        fingerprint,
      },
    });
  } catch (error) {
    console.error("[Performance] Failed to log error:", error);
  }
}

/**
 * Middleware helper to measure API response time
 */
export function createApiTimingMiddleware() {
  return {
    start: () => Date.now(),
    end: async (
      startTime: number,
      path: string,
      method: string,
      request?: Request
    ) => {
      const durationMs = Date.now() - startTime;
      const userAgent = request?.headers.get("user-agent") || undefined;
      const sessionId = request?.headers.get("x-session-id") || undefined;

      // Non-blocking
      logApiResponseTime(path, method, durationMs, {
        sessionId,
        details: { userAgent },
      }).catch(() => {});
    },
  };
}

/**
 * Get performance summary for dashboard
 */
export async function getPerformanceSummary(dateRange?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const where = dateRange
    ? {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      }
    : {};

  // Get Web Vital averages
  const webVitals = await prisma.performanceMetric.groupBy({
    by: ["name"],
    where: {
      ...where,
      type: "WEB_VITAL",
    },
    _avg: { value: true },
    _count: { id: true },
  });

  // Get Web Vital rating distribution
  const webVitalRatings = await prisma.performanceMetric.groupBy({
    by: ["name", "rating"],
    where: {
      ...where,
      type: "WEB_VITAL",
    },
    _count: { id: true },
  });

  // Get API response time stats
  const apiStats = await prisma.performanceMetric.aggregate({
    where: {
      ...where,
      type: "API_RESPONSE",
    },
    _avg: { value: true },
    _max: { value: true },
    _min: { value: true },
    _count: { id: true },
  });

  // Get slowest API endpoints
  const slowestEndpoints = await prisma.performanceMetric.groupBy({
    by: ["name", "method"],
    where: {
      ...where,
      type: "API_RESPONSE",
    },
    _avg: { value: true },
    _count: { id: true },
    orderBy: { _avg: { value: "desc" } },
    take: 10,
  });

  // Get database query stats
  const dbStats = await prisma.performanceMetric.aggregate({
    where: {
      ...where,
      type: "DATABASE_QUERY",
    },
    _avg: { value: true },
    _max: { value: true },
    _count: { id: true },
  });

  // Get slowest queries
  const slowestQueries = await prisma.performanceMetric.groupBy({
    by: ["name"],
    where: {
      ...where,
      type: "DATABASE_QUERY",
    },
    _avg: { value: true },
    _count: { id: true },
    orderBy: { _avg: { value: "desc" } },
    take: 10,
  });

  // Get error count
  const errorCount = await prisma.errorLog.count({
    where: {
      createdAt: where.createdAt,
    },
  });

  // Get unresolved errors
  const unresolvedErrors = await prisma.errorLog.count({
    where: {
      createdAt: where.createdAt,
      resolved: false,
    },
  });

  // Get error trends (grouped by day)
  const errorTrends = await prisma.$queryRaw<
    { date: string; count: bigint }[]
  >`
    SELECT DATE("created_at") as date, COUNT(*) as count
    FROM apolo.error_logs
    WHERE "created_at" >= ${dateRange?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
    GROUP BY DATE("created_at")
    ORDER BY date DESC
    LIMIT 14
  `;

  return {
    webVitals: webVitals.map((v) => ({
      name: v.name,
      avgValue: v._avg.value || 0,
      count: v._count.id,
    })),
    webVitalRatings: webVitalRatings.reduce(
      (acc, r) => {
        if (!acc[r.name]) acc[r.name] = { good: 0, "needs-improvement": 0, poor: 0 };
        if (r.rating) acc[r.name][r.rating as keyof typeof acc[string]] = r._count.id;
        return acc;
      },
      {} as Record<string, { good: number; "needs-improvement": number; poor: number }>
    ),
    api: {
      avgResponseTime: apiStats._avg.value || 0,
      maxResponseTime: apiStats._max.value || 0,
      minResponseTime: apiStats._min.value || 0,
      totalRequests: apiStats._count.id,
      slowestEndpoints: slowestEndpoints.map((e) => ({
        path: e.name,
        method: e.method,
        avgTime: e._avg.value || 0,
        count: e._count.id,
      })),
    },
    database: {
      avgQueryTime: dbStats._avg.value || 0,
      maxQueryTime: dbStats._max.value || 0,
      totalQueries: dbStats._count.id,
      slowestQueries: slowestQueries.map((q) => ({
        name: q.name,
        avgTime: q._avg.value || 0,
        count: q._count.id,
      })),
    },
    errors: {
      total: errorCount,
      unresolved: unresolvedErrors,
      trends: errorTrends.map((t) => ({
        date: t.date,
        count: Number(t.count),
      })),
    },
  };
}

/**
 * Get recent errors with grouping
 */
export async function getRecentErrors(options?: {
  limit?: number;
  resolved?: boolean;
  path?: string;
}) {
  const { limit = 50, resolved, path } = options || {};

  // Get unique errors by fingerprint
  const errors = await prisma.errorLog.findMany({
    where: {
      resolved: resolved !== undefined ? resolved : undefined,
      path: path ? { contains: path } : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Group by fingerprint
  const grouped = errors.reduce(
    (acc, error) => {
      const fp = error.fingerprint || error.id;
      if (!acc[fp]) {
        acc[fp] = {
          ...error,
          count: 1,
          firstSeen: error.createdAt,
          lastSeen: error.createdAt,
        };
      } else {
        acc[fp].count++;
        if (error.createdAt > acc[fp].lastSeen) {
          acc[fp].lastSeen = error.createdAt;
        }
        if (error.createdAt < acc[fp].firstSeen) {
          acc[fp].firstSeen = error.createdAt;
        }
      }
      return acc;
    },
    {} as Record<string, typeof errors[0] & { count: number; firstSeen: Date; lastSeen: Date }>
  );

  return Object.values(grouped).sort(
    (a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()
  );
}

/**
 * Mark error as resolved
 */
export async function resolveError(
  errorId: string,
  resolvedBy?: string
): Promise<void> {
  await prisma.errorLog.update({
    where: { id: errorId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
    },
  });
}

/**
 * Resolve all errors with same fingerprint
 */
export async function resolveErrorsByFingerprint(
  fingerprint: string,
  resolvedBy?: string
): Promise<number> {
  const result = await prisma.errorLog.updateMany({
    where: { fingerprint },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
    },
  });
  return result.count;
}
