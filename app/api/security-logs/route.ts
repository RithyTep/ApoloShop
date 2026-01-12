import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SecurityEventType, SecurityEventSeverity } from "@prisma/client";
import {
  SECURITY_EVENT_CONFIG,
  SECURITY_LOG_RETENTION_DAYS,
  cleanupExpiredSecurityLogs,
  detectSuspiciousPatterns,
  getSecurityLogStats,
} from "@/lib/security-log";

// Valid event types for filtering
const VALID_EVENT_TYPES: SecurityEventType[] = [
  // Authentication
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGIN_2FA_SUCCESS",
  "LOGIN_2FA_FAILED",
  "LOGOUT",
  // Session
  "SESSION_CREATED",
  "SESSION_REVOKED",
  "SESSION_EXPIRED",
  "ALL_SESSIONS_REVOKED",
  // Password
  "PASSWORD_CHANGED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "PASSWORD_RESET_FAILED",
  // 2FA
  "TWO_FACTOR_ENABLED",
  "TWO_FACTOR_DISABLED",
  "TWO_FACTOR_RECOVERY_USED",
  "TWO_FACTOR_RECOVERY_REGENERATED",
  // Account
  "ACCOUNT_CREATED",
  "ACCOUNT_UPDATED",
  "ACCOUNT_LOCKED",
  "ACCOUNT_UNLOCKED",
  "ACCOUNT_DELETED",
  "EMAIL_VERIFIED",
  "EMAIL_VERIFICATION_REQUESTED",
  // Permissions
  "ROLE_ASSIGNED",
  "ROLE_REMOVED",
  "PERMISSION_GRANTED",
  "PERMISSION_REVOKED",
  "ROLE_CREATED",
  "ROLE_UPDATED",
  "ROLE_DELETED",
  // API Keys
  "API_KEY_CREATED",
  "API_KEY_ROTATED",
  "API_KEY_REVOKED",
  "API_KEY_DELETED",
  // OAuth
  "OAUTH_ACCOUNT_LINKED",
  "OAUTH_ACCOUNT_UNLINKED",
  "OAUTH_LOGIN_SUCCESS",
  "OAUTH_LOGIN_FAILED",
  // Security
  "SUSPICIOUS_LOGIN_DETECTED",
  "SUSPICIOUS_LOGIN_REVIEWED",
  "IP_BLOCKED",
  "IP_UNBLOCKED",
  // Admin
  "ADMIN_IMPERSONATION_START",
  "ADMIN_IMPERSONATION_END",
];

const VALID_SEVERITIES: SecurityEventSeverity[] = ["INFO", "WARNING", "CRITICAL"];

// Event type categories for grouping in UI
const EVENT_CATEGORIES: Record<string, SecurityEventType[]> = {
  authentication: ["LOGIN_SUCCESS", "LOGIN_FAILED", "LOGIN_2FA_SUCCESS", "LOGIN_2FA_FAILED", "LOGOUT"],
  session: ["SESSION_CREATED", "SESSION_REVOKED", "SESSION_EXPIRED", "ALL_SESSIONS_REVOKED"],
  password: ["PASSWORD_CHANGED", "PASSWORD_RESET_REQUESTED", "PASSWORD_RESET_COMPLETED", "PASSWORD_RESET_FAILED"],
  twoFactor: ["TWO_FACTOR_ENABLED", "TWO_FACTOR_DISABLED", "TWO_FACTOR_RECOVERY_USED", "TWO_FACTOR_RECOVERY_REGENERATED"],
  account: ["ACCOUNT_CREATED", "ACCOUNT_UPDATED", "ACCOUNT_LOCKED", "ACCOUNT_UNLOCKED", "ACCOUNT_DELETED", "EMAIL_VERIFIED", "EMAIL_VERIFICATION_REQUESTED"],
  permissions: ["ROLE_ASSIGNED", "ROLE_REMOVED", "PERMISSION_GRANTED", "PERMISSION_REVOKED", "ROLE_CREATED", "ROLE_UPDATED", "ROLE_DELETED"],
  apiKeys: ["API_KEY_CREATED", "API_KEY_ROTATED", "API_KEY_REVOKED", "API_KEY_DELETED"],
  oauth: ["OAUTH_ACCOUNT_LINKED", "OAUTH_ACCOUNT_UNLINKED", "OAUTH_LOGIN_SUCCESS", "OAUTH_LOGIN_FAILED"],
  security: ["SUSPICIOUS_LOGIN_DETECTED", "SUSPICIOUS_LOGIN_REVIEWED", "IP_BLOCKED", "IP_UNBLOCKED"],
  admin: ["ADMIN_IMPERSONATION_START", "ADMIN_IMPERSONATION_END"],
};

/**
 * Helper to check super admin role
 * In production, this should use proper authentication middleware
 */
async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  // Check for super admin session/token
  const adminKey = request.headers.get("x-admin-key");
  const expectedKey = process.env.SUPER_ADMIN_KEY;

  // If SUPER_ADMIN_KEY is set, require it
  if (expectedKey) {
    return adminKey === expectedKey;
  }

  // In development without key, allow access (for testing)
  // In production, this should always require proper auth
  return process.env.NODE_ENV === "development";
}

/**
 * GET /api/security-logs - Fetch security logs with filtering and pagination
 * Super admin only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Check super admin permission
    if (!(await isSuperAdmin(request))) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    // Filters
    const userId = searchParams.get("userId");
    const eventType = searchParams.get("event") as SecurityEventType | null;
    const severity = searchParams.get("severity") as SecurityEventSeverity | null;
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");
    const ipAddress = searchParams.get("ipAddress");

    // Special actions
    const action = searchParams.get("action");

    // Handle special actions
    if (action === "cleanup") {
      const result = await cleanupExpiredSecurityLogs();
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${result.deleted} expired security logs`,
        ...result,
      });
    }

    if (action === "stats") {
      const stats = await getSecurityLogStats(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      return NextResponse.json(stats);
    }

    if (action === "alerts") {
      const alerts = await detectSuspiciousPatterns(userId || undefined);
      return NextResponse.json({ alerts });
    }

    // Build where clause
    type WhereClause = {
      userId?: string;
      event?: SecurityEventType | { in: SecurityEventType[] };
      severity?: SecurityEventSeverity;
      ipAddress?: string | { contains: string; mode: "insensitive" };
      createdAt?: { gte?: Date; lte?: Date };
      OR?: Array<{
        userName?: { contains: string; mode: "insensitive" };
        userEmail?: { contains: string; mode: "insensitive" };
        targetUserName?: { contains: string; mode: "insensitive" };
        ipAddress?: { contains: string; mode: "insensitive" };
      }>;
    };

    const where: WhereClause = {};

    if (userId) {
      where.userId = userId;
    }

    if (eventType && VALID_EVENT_TYPES.includes(eventType)) {
      where.event = eventType;
    }

    if (severity && VALID_SEVERITIES.includes(severity)) {
      where.severity = severity;
    }

    // Filter by category (returns multiple event types)
    if (category && EVENT_CATEGORIES[category]) {
      where.event = { in: EVENT_CATEGORIES[category] };
    }

    if (ipAddress) {
      where.ipAddress = { contains: ipAddress, mode: "insensitive" };
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Search filter (searches userName, userEmail, targetUserName, ipAddress)
    if (search && search.trim()) {
      where.OR = [
        { userName: { contains: search.trim(), mode: "insensitive" } },
        { userEmail: { contains: search.trim(), mode: "insensitive" } },
        { targetUserName: { contains: search.trim(), mode: "insensitive" } },
        { ipAddress: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // Fetch logs with pagination
    const [logs, total] = await Promise.all([
      prisma.securityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.securityLog.count({ where }),
    ]);

    // Get summary stats
    const dateFilter = where.createdAt ? { createdAt: where.createdAt } : undefined;

    const [eventStats, severityStats, hourlyActivity, criticalLast24h] = await Promise.all([
      // Count by event type
      prisma.securityLog.groupBy({
        by: ["event"],
        _count: { event: true },
        where: dateFilter,
      }),
      // Count by severity
      prisma.securityLog.groupBy({
        by: ["severity"],
        _count: { severity: true },
        where: dateFilter,
      }),
      // Activity by hour (last 24 hours)
      prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
        FROM apolo.security_logs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `.catch(() => [] as Array<{ hour: number; count: bigint }>),
      // Critical events in last 24 hours
      prisma.securityLog.count({
        where: {
          severity: "CRITICAL",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Format event stats
    const eventSummary: Record<string, number> = {};
    for (const stat of eventStats) {
      eventSummary[stat.event] = stat._count.event;
    }

    // Format severity stats
    const severitySummary: Record<string, number> = {
      INFO: 0,
      WARNING: 0,
      CRITICAL: 0,
    };
    for (const stat of severityStats) {
      severitySummary[stat.severity] = stat._count.severity;
    }

    // Format hourly activity
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const stat = hourlyActivity.find((r) => Number(r.hour) === i);
      return { hour: i, count: stat ? Number(stat.count) : 0 };
    });

    // Add event descriptions for UI
    const logsWithDescriptions = logs.map((log) => ({
      ...log,
      eventDescription: SECURITY_EVENT_CONFIG[log.event]?.description || log.event,
    }));

    return NextResponse.json({
      logs: logsWithDescriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total,
        byEvent: eventSummary,
        bySeverity: severitySummary,
        hourlyActivity: hourlyData,
        criticalLast24h,
      },
      filters: {
        validEventTypes: VALID_EVENT_TYPES,
        validSeverities: VALID_SEVERITIES,
        eventCategories: EVENT_CATEGORIES,
        eventDescriptions: Object.fromEntries(
          Object.entries(SECURITY_EVENT_CONFIG).map(([key, value]) => [key, value.description])
        ),
      },
      config: {
        retentionDays: SECURITY_LOG_RETENTION_DAYS,
      },
    });
  } catch (error) {
    console.error("[SecurityLogs API] Error fetching security logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch security logs" },
      { status: 500 }
    );
  }
}
