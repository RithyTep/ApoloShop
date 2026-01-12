import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@/lib/audit-service";

// Valid action types for filtering
const VALID_ACTIONS: AuditAction[] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "SETTINGS_CHANGE",
];

// Valid resource types for filtering
const VALID_RESOURCES = [
  "product",
  "order",
  "settings",
  "user",
  "category",
  "promotion",
  "inventory",
  "customer",
  "client",
];

/**
 * GET /api/audit-logs - Fetch audit logs with filtering and pagination
 * Admin only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    // Filters
    const userId = searchParams.get("userId");
    const action = searchParams.get("action") as AuditAction | null;
    const resource = searchParams.get("resource");
    const resourceId = searchParams.get("resourceId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    // Build where clause
    const where: {
      userId?: string;
      action?: AuditAction;
      resource?: string;
      resourceId?: string;
      createdAt?: { gte?: Date; lte?: Date };
      OR?: Array<{ userName?: { contains: string; mode: "insensitive" }; resourceId?: { contains: string; mode: "insensitive" } }>;
    } = {};

    if (userId) {
      where.userId = userId;
    }

    if (action && VALID_ACTIONS.includes(action)) {
      where.action = action;
    }

    if (resource && VALID_RESOURCES.includes(resource)) {
      where.resource = resource;
    }

    if (resourceId) {
      where.resourceId = resourceId;
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

    // Search filter (searches userName and resourceId)
    if (search && search.trim()) {
      where.OR = [
        { userName: { contains: search.trim(), mode: "insensitive" } },
        { resourceId: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // Fetch logs with pagination
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Get summary stats
    const [actionStats, resourceStats, recentActivity] = await Promise.all([
      // Count by action type
      prisma.auditLog.groupBy({
        by: ["action"],
        _count: { action: true },
        where: where.createdAt ? { createdAt: where.createdAt } : undefined,
      }),
      // Count by resource type
      prisma.auditLog.groupBy({
        by: ["resource"],
        _count: { resource: true },
        where: where.createdAt ? { createdAt: where.createdAt } : undefined,
      }),
      // Activity by hour (last 24 hours)
      prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
        FROM apolo.audit_logs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `.catch(() => [] as Array<{ hour: number; count: bigint }>),
    ]);

    // Format action stats
    const actionSummary = VALID_ACTIONS.reduce(
      (acc, action) => {
        const stat = actionStats.find((s) => s.action === action);
        acc[action] = stat?._count.action || 0;
        return acc;
      },
      {} as Record<string, number>
    );

    // Format resource stats
    const resourceSummary = VALID_RESOURCES.reduce(
      (acc, resource) => {
        const stat = resourceStats.find((s) => s.resource === resource);
        acc[resource] = stat?._count.resource || 0;
        return acc;
      },
      {} as Record<string, number>
    );

    // Format hourly activity
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
      const stat = recentActivity.find((r) => Number(r.hour) === i);
      return { hour: i, count: stat ? Number(stat.count) : 0 };
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total,
        byAction: actionSummary,
        byResource: resourceSummary,
        hourlyActivity,
      },
      filters: {
        validActions: VALID_ACTIONS,
        validResources: VALID_RESOURCES,
      },
    });
  } catch (error) {
    console.error("[AuditLogs API] Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
