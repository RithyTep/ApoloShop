/**
 * Session Management Service
 * Handles session creation, tracking, and revocation for user authentication
 */

import { prisma } from "./prisma";
import { UAParser } from "ua-parser-js";

// Configuration for session management
export const SESSION_CONFIG = {
  // Session expires after 30 days of inactivity
  sessionDurationDays: 30,
  // Session is considered inactive after 30 days without activity
  inactivityThresholdDays: 30,
  // Maximum concurrent sessions per user (0 = unlimited)
  maxConcurrentSessions: 0,
};

// Types
export interface SessionDevice {
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string;
  os: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceName: string | null;
  deviceType: string | null;
  ipAddress: string | null;
  location: string | null;
  lastActive: Date;
  createdAt: Date;
  isCurrent: boolean;
  isRevoked: boolean;
}

export interface CreateSessionParams {
  userId: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Parse user agent string to extract device information
 */
export function parseUserAgent(userAgent: string | null | undefined): SessionDevice {
  if (!userAgent) {
    return {
      deviceName: "Unknown Device",
      deviceType: "unknown",
      browser: "Unknown",
      os: "Unknown",
    };
  }

  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  // Determine device type
  let deviceType: SessionDevice["deviceType"] = "desktop";
  if (device.type === "mobile") {
    deviceType = "mobile";
  } else if (device.type === "tablet") {
    deviceType = "tablet";
  }

  // Build device name (e.g., "Chrome on Windows")
  const browserName = browser.name || "Unknown Browser";
  const osName = os.name || "Unknown OS";
  const deviceName = `${browserName} on ${osName}`;

  return {
    deviceName,
    deviceType,
    browser: browserName,
    os: osName,
  };
}

/**
 * Extract IP address from request headers
 */
export function extractIpAddress(headers: Headers): string | null {
  // Check various headers used by proxies and CDNs
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // Take the first IP if multiple are present
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp;
  }

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return null;
}

/**
 * Create a new session for a user
 */
export async function createSession({
  userId,
  token,
  ipAddress,
  userAgent,
}: CreateSessionParams): Promise<SessionInfo> {
  const deviceInfo = parseUserAgent(userAgent);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_CONFIG.sessionDurationDays);

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      expiresAt,
      lastActive: new Date(),
    },
  });

  return {
    id: session.id,
    userId: session.userId,
    deviceName: session.deviceName,
    deviceType: session.deviceType,
    ipAddress: session.ipAddress,
    location: session.location,
    lastActive: session.lastActive,
    createdAt: session.createdAt,
    isCurrent: false,
    isRevoked: session.isRevoked,
  };
}

/**
 * Update the lastActive timestamp for a session
 */
export async function touchSession(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastActive: new Date() },
  }).catch(() => {
    // Silently fail if session doesn't exist
  });
}

/**
 * Update session activity by token
 */
export async function touchSessionByToken(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: { token, isRevoked: false },
    data: { lastActive: new Date() },
  }).catch(() => {
    // Silently fail if session doesn't exist
  });
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(
  userId: string,
  currentSessionId?: string
): Promise<SessionInfo[]> {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastActive: "desc" },
  });

  return sessions.map((session) => ({
    id: session.id,
    userId: session.userId,
    deviceName: session.deviceName,
    deviceType: session.deviceType,
    ipAddress: session.ipAddress,
    location: session.location,
    lastActive: session.lastActive,
    createdAt: session.createdAt,
    isCurrent: session.id === currentSessionId,
    isRevoked: session.isRevoked,
  }));
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.session.updateMany({
    where: {
      id: sessionId,
      userId, // Ensure user can only revoke their own sessions
      isRevoked: false,
    },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });

  return result.count > 0;
}

/**
 * Revoke all sessions for a user except the current one
 */
export async function revokeAllSessionsExcept(
  userId: string,
  exceptSessionId?: string
): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      isRevoked: false,
      ...(exceptSessionId && { id: { not: exceptSessionId } }),
    },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Revoke all sessions for a user (full logout)
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      isRevoked: false,
    },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Check if a session is valid (not revoked and not expired)
 */
export async function validateSession(token: string): Promise<SessionInfo | null> {
  const session = await prisma.session.findUnique({
    where: { token },
  });

  if (!session) {
    return null;
  }

  // Check if revoked
  if (session.isRevoked) {
    return null;
  }

  // Check if expired
  if (session.expiresAt < new Date()) {
    return null;
  }

  // Check inactivity
  const inactivityThreshold = new Date();
  inactivityThreshold.setDate(
    inactivityThreshold.getDate() - SESSION_CONFIG.inactivityThresholdDays
  );
  if (session.lastActive < inactivityThreshold) {
    // Auto-expire due to inactivity
    await prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    return null;
  }

  return {
    id: session.id,
    userId: session.userId,
    deviceName: session.deviceName,
    deviceType: session.deviceType,
    ipAddress: session.ipAddress,
    location: session.location,
    lastActive: session.lastActive,
    createdAt: session.createdAt,
    isCurrent: false,
    isRevoked: session.isRevoked,
  };
}

/**
 * Get session by token
 */
export async function getSessionByToken(token: string) {
  return prisma.session.findUnique({
    where: { token },
  });
}

/**
 * Cleanup expired sessions (can be run as a cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { isRevoked: true },
      ],
    },
  });

  return result.count;
}

/**
 * Get session statistics for a user
 */
export async function getSessionStats(userId: string): Promise<{
  totalActive: number;
  deviceTypes: { type: string; count: number }[];
  mostRecentActivity: Date | null;
}> {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    select: {
      deviceType: true,
      lastActive: true,
    },
  });

  // Count by device type
  const deviceTypeCounts: Record<string, number> = {};
  let mostRecentActivity: Date | null = null;

  for (const session of sessions) {
    const type = session.deviceType || "unknown";
    deviceTypeCounts[type] = (deviceTypeCounts[type] || 0) + 1;

    if (!mostRecentActivity || session.lastActive > mostRecentActivity) {
      mostRecentActivity = session.lastActive;
    }
  }

  return {
    totalActive: sessions.length,
    deviceTypes: Object.entries(deviceTypeCounts).map(([type, count]) => ({
      type,
      count,
    })),
    mostRecentActivity,
  };
}

/**
 * Format session for display (hide sensitive info)
 */
export function formatSessionForDisplay(session: SessionInfo): {
  id: string;
  deviceName: string;
  deviceType: string;
  location: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
} {
  return {
    id: session.id,
    deviceName: session.deviceName || "Unknown Device",
    deviceType: session.deviceType || "unknown",
    location: session.location || session.ipAddress || "Unknown Location",
    lastActive: session.lastActive.toISOString(),
    createdAt: session.createdAt.toISOString(),
    isCurrent: session.isCurrent,
  };
}
