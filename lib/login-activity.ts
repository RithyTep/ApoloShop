/**
 * Login Activity Service
 * Tracks login activities, detects new devices/locations, and sends notifications
 */

import { prisma } from "./prisma";
import { parseUserAgent, extractIpAddress } from "./session-service";
import { sendEmailNotification } from "./notification-service";
import { translations, type Language } from "./i18n";

// Configuration
export const LOGIN_ACTIVITY_CONFIG = {
  // How far back to look for previous logins (30 days)
  historyDays: 30,
  // Notification cooldown - don't send for same device within this period
  notificationCooldownHours: 24,
};

// Types
export interface LoginActivityData {
  userId: string;
  sessionId?: string;
  ipAddress: string;
  userAgent?: string;
  country?: string;
  city?: string;
  region?: string;
}

export interface LoginActivityResult {
  id: string;
  isNewDevice: boolean;
  isNewLocation: boolean;
  notificationSent: boolean;
  deviceName: string | null;
  location: string | null;
}

export interface LoginNotificationData {
  userName: string;
  userEmail: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  timestamp: Date;
  loginActivityId: string;
}

/**
 * Format location string from country, city, and region
 */
export function formatLocation(
  country?: string | null,
  city?: string | null,
  region?: string | null
): string {
  const parts = [city, region, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Unknown Location";
}

/**
 * Check if this is a new device for the user
 */
async function isNewDevice(
  userId: string,
  deviceName: string,
  cutoffDate: Date
): Promise<boolean> {
  const existingLogin = await prisma.loginActivity.findFirst({
    where: {
      userId,
      deviceName,
      createdAt: { gte: cutoffDate },
    },
    select: { id: true },
  });

  return !existingLogin;
}

/**
 * Check if this is a new location for the user
 */
async function isNewLocation(
  userId: string,
  ipAddress: string,
  country: string | null,
  cutoffDate: Date
): Promise<boolean> {
  // If no country info, check by IP address
  if (!country) {
    const existingLogin = await prisma.loginActivity.findFirst({
      where: {
        userId,
        ipAddress,
        createdAt: { gte: cutoffDate },
      },
      select: { id: true },
    });
    return !existingLogin;
  }

  // Check by country (more flexible for dynamic IPs)
  const existingLogin = await prisma.loginActivity.findFirst({
    where: {
      userId,
      country,
      createdAt: { gte: cutoffDate },
    },
    select: { id: true },
  });

  return !existingLogin;
}

/**
 * Check if notification should be sent (not within cooldown period)
 */
async function shouldSendNotification(
  userId: string,
  deviceName: string,
  ipAddress: string
): Promise<boolean> {
  const cooldownDate = new Date();
  cooldownDate.setHours(cooldownDate.getHours() - LOGIN_ACTIVITY_CONFIG.notificationCooldownHours);

  const recentNotification = await prisma.loginActivity.findFirst({
    where: {
      userId,
      OR: [
        { deviceName, ipAddress },
      ],
      notificationSent: true,
      createdAt: { gte: cooldownDate },
    },
    select: { id: true },
  });

  return !recentNotification;
}

/**
 * Record login activity and detect if it's a new device/location
 */
export async function recordLoginActivity(
  data: LoginActivityData
): Promise<LoginActivityResult> {
  const deviceInfo = parseUserAgent(data.userAgent);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOGIN_ACTIVITY_CONFIG.historyDays);

  // Check if this is a new device or location
  const [newDevice, newLocation] = await Promise.all([
    isNewDevice(data.userId, deviceInfo.deviceName, cutoffDate),
    isNewLocation(data.userId, data.ipAddress, data.country || null, cutoffDate),
  ]);

  // Create the login activity record
  const activity = await prisma.loginActivity.create({
    data: {
      userId: data.userId,
      sessionId: data.sessionId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ipAddress: data.ipAddress,
      country: data.country,
      city: data.city,
      region: data.region,
      isNewDevice: newDevice,
      isNewLocation: newLocation,
      notificationSent: false,
    },
  });

  const location = formatLocation(data.country, data.city, data.region);

  return {
    id: activity.id,
    isNewDevice: newDevice,
    isNewLocation: newLocation,
    notificationSent: false,
    deviceName: deviceInfo.deviceName,
    location,
  };
}

/**
 * Send login notification email to user
 */
export async function sendLoginNotification(
  data: LoginNotificationData,
  language: Language = "en"
): Promise<boolean> {
  const t = translations[language].loginActivity;

  const subject = language === "en"
    ? "New login to your ApoloShop account"
    : "ការចូលគណនី ApoloShop ថ្មី";

  const timestamp = data.timestamp.toLocaleString(language === "en" ? "en-US" : "km-KH", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const message = `
${t.greeting.replace("{name}", data.userName)}

${t.newLoginDetected}

${t.device}: ${data.deviceName}
${t.browser}: ${data.browser}
${t.os}: ${data.os}
${t.ipAddress}: ${data.ipAddress}
${t.location}: ${data.location}
${t.time}: ${timestamp}

${t.notYouQuestion}

${t.securityTip}

${t.footer}
  `.trim();

  try {
    const result = await sendEmailNotification(data.userEmail, subject, message);

    if (result.success) {
      // Mark notification as sent
      await prisma.loginActivity.update({
        where: { id: data.loginActivityId },
        data: { notificationSent: true },
      }).catch(() => {
        // Non-critical: silently fail if update fails
      });
    }

    return result.success;
  } catch (error) {
    console.error("[LoginActivity] Failed to send notification:", error);
    return false;
  }
}

/**
 * Process login activity and send notification if needed
 * This is the main function to call after a successful login
 */
export async function processLoginActivity(
  data: LoginActivityData & {
    userName: string;
    userEmail: string;
    loginNotificationsEnabled: boolean;
  },
  language: Language = "en"
): Promise<LoginActivityResult> {
  // Record the activity
  const activity = await recordLoginActivity(data);

  // Check if we should send a notification
  if (
    data.loginNotificationsEnabled &&
    (activity.isNewDevice || activity.isNewLocation)
  ) {
    const deviceInfo = parseUserAgent(data.userAgent);
    const shouldNotify = await shouldSendNotification(
      data.userId,
      deviceInfo.deviceName,
      data.ipAddress
    );

    if (shouldNotify) {
      // Send notification (fire and forget)
      sendLoginNotification({
        userName: data.userName,
        userEmail: data.userEmail,
        deviceName: activity.deviceName || "Unknown Device",
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ipAddress: data.ipAddress,
        location: activity.location || "Unknown Location",
        timestamp: new Date(),
        loginActivityId: activity.id,
      }, language).catch(() => {
        // Non-critical: silently fail
      });

      activity.notificationSent = true;
    }
  }

  return activity;
}

/**
 * Get user's recent login activities
 */
export async function getUserLoginActivities(
  userId: string,
  options?: {
    limit?: number;
    includeReviewed?: boolean;
  }
): Promise<Array<{
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string;
  location: string;
  isNewDevice: boolean;
  isNewLocation: boolean;
  markedSuspicious: boolean;
  createdAt: Date;
}>> {
  const activities = await prisma.loginActivity.findMany({
    where: {
      userId,
      ...(options?.includeReviewed !== true && { reviewedAt: null }),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit || 20,
  });

  return activities.map((a) => ({
    id: a.id,
    deviceName: a.deviceName,
    deviceType: a.deviceType,
    browser: a.browser,
    os: a.os,
    ipAddress: a.ipAddress,
    location: formatLocation(a.country, a.city, a.region),
    isNewDevice: a.isNewDevice,
    isNewLocation: a.isNewLocation,
    markedSuspicious: a.markedSuspicious,
    createdAt: a.createdAt,
  }));
}

/**
 * Mark a login activity as suspicious ("not me")
 */
export async function markLoginAsSuspicious(
  loginActivityId: string,
  userId: string
): Promise<{
  success: boolean;
  activity?: {
    id: string;
    deviceName: string | null;
    ipAddress: string;
    createdAt: Date;
  };
}> {
  // Verify the activity belongs to the user
  const activity = await prisma.loginActivity.findFirst({
    where: {
      id: loginActivityId,
      userId,
    },
  });

  if (!activity) {
    return { success: false };
  }

  // Mark as suspicious
  await prisma.loginActivity.update({
    where: { id: loginActivityId },
    data: {
      markedSuspicious: true,
      suspiciousAt: new Date(),
    },
  });

  return {
    success: true,
    activity: {
      id: activity.id,
      deviceName: activity.deviceName,
      ipAddress: activity.ipAddress,
      createdAt: activity.createdAt,
    },
  };
}

/**
 * Review a suspicious login (admin action)
 */
export async function reviewSuspiciousLogin(
  loginActivityId: string,
  reviewNotes?: string
): Promise<boolean> {
  try {
    await prisma.loginActivity.update({
      where: { id: loginActivityId },
      data: {
        reviewedAt: new Date(),
        reviewNotes,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get suspicious login activities for admin review
 */
export async function getSuspiciousLoginActivities(
  options?: {
    limit?: number;
    includeReviewed?: boolean;
  }
): Promise<Array<{
  id: string;
  userId: string;
  deviceName: string | null;
  ipAddress: string;
  location: string;
  markedSuspicious: boolean;
  suspiciousAt: Date | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
}>> {
  const activities = await prisma.loginActivity.findMany({
    where: {
      markedSuspicious: true,
      ...(options?.includeReviewed !== true && { reviewedAt: null }),
    },
    orderBy: { suspiciousAt: "desc" },
    take: options?.limit || 50,
  });

  return activities.map((a) => ({
    id: a.id,
    userId: a.userId,
    deviceName: a.deviceName,
    ipAddress: a.ipAddress,
    location: formatLocation(a.country, a.city, a.region),
    markedSuspicious: a.markedSuspicious,
    suspiciousAt: a.suspiciousAt,
    reviewedAt: a.reviewedAt,
    reviewNotes: a.reviewNotes,
    createdAt: a.createdAt,
  }));
}

/**
 * Update user's login notification preference
 */
export async function updateLoginNotificationPreference(
  userId: string,
  enabled: boolean
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { loginNotificationsEnabled: enabled },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up old login activities (can be run as a cron job)
 */
export async function cleanupOldLoginActivities(
  retentionDays: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.loginActivity.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      // Keep suspicious activities longer
      markedSuspicious: false,
    },
  });

  return result.count;
}
