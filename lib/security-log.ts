import { prisma } from "@/lib/prisma";
import type { SecurityEventType, SecurityEventSeverity, SecurityLog } from "@prisma/client";

// Re-export types for convenience
export type { SecurityEventType, SecurityEventSeverity, SecurityLog };

/**
 * Security log retention period in days
 */
export const SECURITY_LOG_RETENTION_DAYS = 90;

/**
 * Security event configuration
 */
export const SECURITY_EVENT_CONFIG: Record<
  SecurityEventType,
  { severity: SecurityEventSeverity; description: string }
> = {
  // Authentication events
  LOGIN_SUCCESS: { severity: "INFO", description: "User logged in successfully" },
  LOGIN_FAILED: { severity: "WARNING", description: "Failed login attempt" },
  LOGIN_2FA_SUCCESS: { severity: "INFO", description: "2FA verification successful" },
  LOGIN_2FA_FAILED: { severity: "WARNING", description: "2FA verification failed" },
  LOGOUT: { severity: "INFO", description: "User logged out" },
  // Session events
  SESSION_CREATED: { severity: "INFO", description: "New session created" },
  SESSION_REVOKED: { severity: "INFO", description: "Session was revoked" },
  SESSION_EXPIRED: { severity: "INFO", description: "Session expired" },
  ALL_SESSIONS_REVOKED: { severity: "WARNING", description: "All user sessions revoked" },
  // Password events
  PASSWORD_CHANGED: { severity: "WARNING", description: "Password was changed" },
  PASSWORD_RESET_REQUESTED: { severity: "INFO", description: "Password reset requested" },
  PASSWORD_RESET_COMPLETED: { severity: "WARNING", description: "Password reset completed" },
  PASSWORD_RESET_FAILED: { severity: "WARNING", description: "Password reset failed" },
  // 2FA events
  TWO_FACTOR_ENABLED: { severity: "WARNING", description: "Two-factor authentication enabled" },
  TWO_FACTOR_DISABLED: { severity: "WARNING", description: "Two-factor authentication disabled" },
  TWO_FACTOR_RECOVERY_USED: { severity: "WARNING", description: "Recovery code used for 2FA" },
  TWO_FACTOR_RECOVERY_REGENERATED: { severity: "WARNING", description: "2FA recovery codes regenerated" },
  // Account events
  ACCOUNT_CREATED: { severity: "INFO", description: "Account was created" },
  ACCOUNT_UPDATED: { severity: "INFO", description: "Account was updated" },
  ACCOUNT_LOCKED: { severity: "CRITICAL", description: "Account was locked due to failed attempts" },
  ACCOUNT_UNLOCKED: { severity: "WARNING", description: "Account was unlocked" },
  ACCOUNT_DELETED: { severity: "WARNING", description: "Account was deleted" },
  EMAIL_VERIFIED: { severity: "INFO", description: "Email address verified" },
  EMAIL_VERIFICATION_REQUESTED: { severity: "INFO", description: "Email verification requested" },
  // Permission events
  ROLE_ASSIGNED: { severity: "WARNING", description: "Role assigned to user" },
  ROLE_REMOVED: { severity: "WARNING", description: "Role removed from user" },
  PERMISSION_GRANTED: { severity: "WARNING", description: "Permission granted to role" },
  PERMISSION_REVOKED: { severity: "WARNING", description: "Permission revoked from role" },
  ROLE_CREATED: { severity: "INFO", description: "New role created" },
  ROLE_UPDATED: { severity: "WARNING", description: "Role was updated" },
  ROLE_DELETED: { severity: "WARNING", description: "Role was deleted" },
  // API key events
  API_KEY_CREATED: { severity: "WARNING", description: "API key was created" },
  API_KEY_ROTATED: { severity: "INFO", description: "API key was rotated" },
  API_KEY_REVOKED: { severity: "WARNING", description: "API key was revoked" },
  API_KEY_DELETED: { severity: "WARNING", description: "API key was deleted" },
  // OAuth events
  OAUTH_ACCOUNT_LINKED: { severity: "INFO", description: "Social account linked" },
  OAUTH_ACCOUNT_UNLINKED: { severity: "WARNING", description: "Social account unlinked" },
  OAUTH_LOGIN_SUCCESS: { severity: "INFO", description: "OAuth login successful" },
  OAUTH_LOGIN_FAILED: { severity: "WARNING", description: "OAuth login failed" },
  // Security events
  SUSPICIOUS_LOGIN_DETECTED: { severity: "CRITICAL", description: "Suspicious login activity detected" },
  SUSPICIOUS_LOGIN_REVIEWED: { severity: "INFO", description: "Suspicious login reviewed" },
  IP_BLOCKED: { severity: "CRITICAL", description: "IP address was blocked" },
  IP_UNBLOCKED: { severity: "WARNING", description: "IP address was unblocked" },
  // Admin actions
  ADMIN_IMPERSONATION_START: { severity: "CRITICAL", description: "Admin started impersonation" },
  ADMIN_IMPERSONATION_END: { severity: "INFO", description: "Admin ended impersonation" },
};

/**
 * Security log entry input
 */
export interface SecurityLogEntry {
  event: SecurityEventType;
  severity?: SecurityEventSeverity;
  // User context
  userId?: string;
  userName?: string;
  userEmail?: string;
  // Target user (for admin actions affecting another user)
  targetUserId?: string;
  targetUserName?: string;
  // Request context
  ipAddress?: string;
  userAgent?: string;
  // Location (optional)
  country?: string;
  city?: string;
  // Event details
  details?: Record<string, unknown>;
  sessionId?: string;
}

/**
 * Extract client IP and user agent from request headers
 */
export function extractSecurityRequestInfo(request: Request): {
  ipAddress: string | undefined;
  userAgent: string | undefined;
} {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  const ipAddress = forwardedFor?.split(",")[0].trim() || realIp || cfConnectingIp || undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  return { ipAddress, userAgent };
}

/**
 * Calculate expiration date based on retention policy
 */
function calculateExpiresAt(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SECURITY_LOG_RETENTION_DAYS);
  return expiresAt;
}

/**
 * Log a security event to the database
 * Non-blocking - fire and forget pattern
 */
export async function logSecurityEvent(entry: SecurityLogEntry): Promise<void> {
  try {
    const config = SECURITY_EVENT_CONFIG[entry.event];
    const severity = entry.severity || config?.severity || "INFO";

    await prisma.securityLog.create({
      data: {
        event: entry.event,
        severity,
        userId: entry.userId,
        userName: entry.userName,
        userEmail: entry.userEmail,
        targetUserId: entry.targetUserId,
        targetUserName: entry.targetUserName,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        country: entry.country,
        city: entry.city,
        details: entry.details,
        sessionId: entry.sessionId,
        expiresAt: calculateExpiresAt(),
      },
    });
  } catch (error) {
    // Log error but don't throw - security logging should not break the main operation
    console.error("[SecurityLog] Failed to log security event:", error);
  }
}

/**
 * Log security event with request context
 */
export async function logSecurityEventWithRequest(
  entry: Omit<SecurityLogEntry, "ipAddress" | "userAgent">,
  request: Request
): Promise<void> {
  const requestInfo = extractSecurityRequestInfo(request);
  return logSecurityEvent({
    ...entry,
    ...requestInfo,
  });
}

// ============================================
// Helper functions for specific event types
// ============================================

/**
 * Log a login success event
 */
export function logLoginSuccess(
  userId: string,
  userName: string,
  request?: Request,
  details?: Record<string, unknown>
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "LOGIN_SUCCESS",
    userId,
    userName,
    details,
    ...requestInfo,
  });
}

/**
 * Log a login failure event
 */
export function logLoginFailed(
  email: string,
  request?: Request,
  details?: Record<string, unknown>
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "LOGIN_FAILED",
    userEmail: email,
    details,
    ...requestInfo,
  });
}

/**
 * Log 2FA verification success
 */
export function log2FASuccess(
  userId: string,
  userName: string,
  request?: Request,
  details?: Record<string, unknown>
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "LOGIN_2FA_SUCCESS",
    userId,
    userName,
    details,
    ...requestInfo,
  });
}

/**
 * Log 2FA verification failure
 */
export function log2FAFailed(
  userId: string,
  userName: string,
  request?: Request,
  details?: Record<string, unknown>
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "LOGIN_2FA_FAILED",
    userId,
    userName,
    details,
    ...requestInfo,
  });
}

/**
 * Log logout event
 */
export function logLogout(
  userId: string,
  userName: string,
  request?: Request
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "LOGOUT",
    userId,
    userName,
    ...requestInfo,
  });
}

/**
 * Log password change event
 */
export function logPasswordChanged(
  userId: string,
  userName: string,
  request?: Request
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "PASSWORD_CHANGED",
    userId,
    userName,
    ...requestInfo,
  });
}

/**
 * Log password reset requested
 */
export function logPasswordResetRequested(
  email: string,
  userId?: string,
  userName?: string,
  request?: Request
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "PASSWORD_RESET_REQUESTED",
    userId,
    userName,
    userEmail: email,
    ...requestInfo,
  });
}

/**
 * Log password reset completed
 */
export function logPasswordResetCompleted(
  userId: string,
  userName: string,
  request?: Request
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "PASSWORD_RESET_COMPLETED",
    userId,
    userName,
    ...requestInfo,
  });
}

/**
 * Log 2FA enabled
 */
export function log2FAEnabled(
  userId: string,
  userName: string,
  request?: Request
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "TWO_FACTOR_ENABLED",
    userId,
    userName,
    ...requestInfo,
  });
}

/**
 * Log 2FA disabled
 */
export function log2FADisabled(
  userId: string,
  userName: string,
  request?: Request
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "TWO_FACTOR_DISABLED",
    userId,
    userName,
    ...requestInfo,
  });
}

/**
 * Log recovery code used
 */
export function logRecoveryCodeUsed(
  userId: string,
  userName: string,
  request?: Request,
  details?: Record<string, unknown>
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "TWO_FACTOR_RECOVERY_USED",
    userId,
    userName,
    details,
    ...requestInfo,
  });
}

/**
 * Log account locked
 */
export function logAccountLocked(
  userId: string,
  userName: string,
  request?: Request,
  details?: Record<string, unknown>
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "ACCOUNT_LOCKED",
    severity: "CRITICAL",
    userId,
    userName,
    details,
    ...requestInfo,
  });
}

/**
 * Log account unlocked
 */
export function logAccountUnlocked(
  targetUserId: string,
  targetUserName: string,
  adminUserId?: string,
  adminUserName?: string,
  request?: Request
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "ACCOUNT_UNLOCKED",
    userId: adminUserId,
    userName: adminUserName,
    targetUserId,
    targetUserName,
    ...requestInfo,
  });
}

/**
 * Log role assigned
 */
export function logRoleAssigned(
  targetUserId: string,
  targetUserName: string,
  roleName: string,
  adminUserId?: string,
  adminUserName?: string,
  request?: Request
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "ROLE_ASSIGNED",
    userId: adminUserId,
    userName: adminUserName,
    targetUserId,
    targetUserName,
    details: { roleName },
    ...requestInfo,
  });
}

/**
 * Log permission change (grant/revoke)
 */
export function logPermissionChange(
  event: "PERMISSION_GRANTED" | "PERMISSION_REVOKED",
  roleName: string,
  permissions: string[],
  adminUserId?: string,
  adminUserName?: string,
  request?: Request
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event,
    userId: adminUserId,
    userName: adminUserName,
    details: { roleName, permissions },
    ...requestInfo,
  });
}

/**
 * Log suspicious login detection
 */
export function logSuspiciousLogin(
  userId: string,
  userName: string,
  reason: string,
  request?: Request,
  details?: Record<string, unknown>
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event: "SUSPICIOUS_LOGIN_DETECTED",
    severity: "CRITICAL",
    userId,
    userName,
    details: { reason, ...details },
    ...requestInfo,
  });
}

/**
 * Log API key event
 */
export function logApiKeyEvent(
  event: "API_KEY_CREATED" | "API_KEY_ROTATED" | "API_KEY_REVOKED" | "API_KEY_DELETED",
  keyName: string,
  keyPrefix: string,
  userId?: string,
  userName?: string,
  request?: Request
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event,
    userId,
    userName,
    details: { keyName, keyPrefix },
    ...requestInfo,
  });
}

/**
 * Log session event
 */
export function logSessionEvent(
  event: "SESSION_CREATED" | "SESSION_REVOKED" | "SESSION_EXPIRED" | "ALL_SESSIONS_REVOKED",
  userId: string,
  userName: string,
  sessionId?: string,
  request?: Request,
  details?: Record<string, unknown>
): void {
  const requestInfo = request ? extractSecurityRequestInfo(request) : {};
  logSecurityEvent({
    event,
    userId,
    userName,
    sessionId,
    details,
    ...requestInfo,
  });
}

// ============================================
// Cleanup and maintenance functions
// ============================================

/**
 * Clean up expired security logs (older than retention period)
 * Should be called periodically (e.g., daily cron job)
 */
export async function cleanupExpiredSecurityLogs(): Promise<{ deleted: number }> {
  try {
    const result = await prisma.securityLog.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`[SecurityLog] Cleaned up ${result.count} expired security logs`);
    return { deleted: result.count };
  } catch (error) {
    console.error("[SecurityLog] Failed to cleanup expired logs:", error);
    return { deleted: 0 };
  }
}

/**
 * Get security log statistics for dashboard
 */
export async function getSecurityLogStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalEvents: number;
  byEventType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentCritical: number;
}> {
  const dateFilter = {
    ...(startDate && { gte: startDate }),
    ...(endDate && { lte: endDate }),
  };

  const [totalEvents, eventTypeCounts, severityCounts, recentCritical] = await Promise.all([
    prisma.securityLog.count({
      where: startDate || endDate ? { createdAt: dateFilter } : undefined,
    }),
    prisma.securityLog.groupBy({
      by: ["event"],
      _count: true,
      where: startDate || endDate ? { createdAt: dateFilter } : undefined,
    }),
    prisma.securityLog.groupBy({
      by: ["severity"],
      _count: true,
      where: startDate || endDate ? { createdAt: dateFilter } : undefined,
    }),
    prisma.securityLog.count({
      where: {
        severity: "CRITICAL",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    }),
  ]);

  const byEventType: Record<string, number> = {};
  for (const item of eventTypeCounts) {
    byEventType[item.event] = item._count;
  }

  const bySeverity: Record<string, number> = {};
  for (const item of severityCounts) {
    bySeverity[item.severity] = item._count;
  }

  return {
    totalEvents,
    byEventType,
    bySeverity,
    recentCritical,
  };
}

/**
 * Check for suspicious patterns in recent security events
 * Returns alerts for patterns that may indicate security issues
 */
export async function detectSuspiciousPatterns(
  userId?: string
): Promise<
  Array<{
    pattern: string;
    severity: SecurityEventSeverity;
    count: number;
    message: string;
  }>
> {
  const alerts: Array<{
    pattern: string;
    severity: SecurityEventSeverity;
    count: number;
    message: string;
  }> = [];

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lastHour = new Date(Date.now() - 60 * 60 * 1000);

  const whereClause = {
    createdAt: { gte: last24Hours },
    ...(userId && { userId }),
  };

  // Check for multiple failed logins
  const failedLogins = await prisma.securityLog.count({
    where: {
      ...whereClause,
      event: "LOGIN_FAILED",
      createdAt: { gte: lastHour },
    },
  });

  if (failedLogins >= 5) {
    alerts.push({
      pattern: "MULTIPLE_FAILED_LOGINS",
      severity: "WARNING",
      count: failedLogins,
      message: `${failedLogins} failed login attempts in the last hour`,
    });
  }

  // Check for multiple 2FA failures
  const failed2FA = await prisma.securityLog.count({
    where: {
      ...whereClause,
      event: "LOGIN_2FA_FAILED",
      createdAt: { gte: lastHour },
    },
  });

  if (failed2FA >= 3) {
    alerts.push({
      pattern: "MULTIPLE_2FA_FAILURES",
      severity: "WARNING",
      count: failed2FA,
      message: `${failed2FA} failed 2FA attempts in the last hour`,
    });
  }

  // Check for password reset spam
  const passwordResets = await prisma.securityLog.count({
    where: {
      ...whereClause,
      event: "PASSWORD_RESET_REQUESTED",
    },
  });

  if (passwordResets >= 5) {
    alerts.push({
      pattern: "PASSWORD_RESET_SPAM",
      severity: "WARNING",
      count: passwordResets,
      message: `${passwordResets} password reset requests in the last 24 hours`,
    });
  }

  // Check for multiple account lockouts
  const lockouts = await prisma.securityLog.count({
    where: {
      ...whereClause,
      event: "ACCOUNT_LOCKED",
    },
  });

  if (lockouts >= 2) {
    alerts.push({
      pattern: "MULTIPLE_LOCKOUTS",
      severity: "CRITICAL",
      count: lockouts,
      message: `${lockouts} account lockouts in the last 24 hours`,
    });
  }

  return alerts;
}
