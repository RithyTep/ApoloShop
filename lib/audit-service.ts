import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "SETTINGS_CHANGE";

export interface AuditLogEntry {
  userId?: string;
  userName?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit entry to the database
 * Non-blocking - fire and forget pattern
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        userName: entry.userName,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    console.error("[AuditService] Failed to log audit entry:", error);
  }
}

/**
 * Extract client IP and user agent from request headers
 */
export function extractRequestInfo(request: Request): {
  ipAddress: string | undefined;
  userAgent: string | undefined;
} {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0].trim() || realIp || undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  return { ipAddress, userAgent };
}

/**
 * Create a diff of changes between old and new objects
 * Only includes fields that have changed
 */
export function createChangeDiff(
  oldObj: Record<string, unknown> | null,
  newObj: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown> } | null {
  if (!oldObj) {
    return { before: {}, after: newObj };
  }

  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  let hasChanges = false;

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    // Skip timestamps and internal fields
    if (["createdAt", "updatedAt", "id"].includes(key)) continue;

    const oldValue = oldObj[key];
    const newValue = newObj[key];

    // Compare values (simple comparison, handles primitives and arrays)
    const oldStr = JSON.stringify(oldValue);
    const newStr = JSON.stringify(newValue);

    if (oldStr !== newStr) {
      before[key] = oldValue;
      after[key] = newValue;
      hasChanges = true;
    }
  }

  return hasChanges ? { before, after } : null;
}

/**
 * Helper to log product changes
 */
export async function logProductAudit(
  action: AuditAction,
  productId: string,
  userId?: string,
  userName?: string,
  details?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  const requestInfo = request ? extractRequestInfo(request) : {};
  logAudit({
    userId,
    userName,
    action,
    resource: "product",
    resourceId: productId,
    details,
    ...requestInfo,
  });
}

/**
 * Helper to log order changes
 */
export async function logOrderAudit(
  action: AuditAction,
  orderId: string,
  userId?: string,
  userName?: string,
  details?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  const requestInfo = request ? extractRequestInfo(request) : {};
  logAudit({
    userId,
    userName,
    action,
    resource: "order",
    resourceId: orderId,
    details,
    ...requestInfo,
  });
}

/**
 * Helper to log settings changes
 */
export async function logSettingsAudit(
  settingKey: string,
  userId?: string,
  userName?: string,
  details?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  const requestInfo = request ? extractRequestInfo(request) : {};
  logAudit({
    userId,
    userName,
    action: "SETTINGS_CHANGE",
    resource: "settings",
    resourceId: settingKey,
    details,
    ...requestInfo,
  });
}

/**
 * Helper to log user/customer changes
 */
export async function logUserAudit(
  action: AuditAction,
  targetUserId: string,
  userId?: string,
  userName?: string,
  details?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  const requestInfo = request ? extractRequestInfo(request) : {};
  logAudit({
    userId,
    userName,
    action,
    resource: "user",
    resourceId: targetUserId,
    details,
    ...requestInfo,
  });
}

/**
 * Helper to log category changes
 */
export async function logCategoryAudit(
  action: AuditAction,
  categoryId: string,
  userId?: string,
  userName?: string,
  details?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  const requestInfo = request ? extractRequestInfo(request) : {};
  logAudit({
    userId,
    userName,
    action,
    resource: "category",
    resourceId: categoryId,
    details,
    ...requestInfo,
  });
}

/**
 * Helper to log promotion changes
 */
export async function logPromotionAudit(
  action: AuditAction,
  promotionId: string,
  userId?: string,
  userName?: string,
  details?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  const requestInfo = request ? extractRequestInfo(request) : {};
  logAudit({
    userId,
    userName,
    action,
    resource: "promotion",
    resourceId: promotionId,
    details,
    ...requestInfo,
  });
}

/**
 * Helper to log inventory changes
 */
export async function logInventoryAudit(
  action: AuditAction,
  productId: string,
  userId?: string,
  userName?: string,
  details?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  const requestInfo = request ? extractRequestInfo(request) : {};
  logAudit({
    userId,
    userName,
    action,
    resource: "inventory",
    resourceId: productId,
    details,
    ...requestInfo,
  });
}
