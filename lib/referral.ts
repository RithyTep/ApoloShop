// Referral Program Service
// Handles referral code generation, tracking, and rewards

import prisma from "@/lib/prisma";
import { ReferralStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================
// CONFIGURATION
// ============================================

export const REFERRAL_CONFIG = {
  // Reward amounts
  referrerReward: 5.0, // USD - reward for the person who refers
  refereeReward: 5.0, // USD - reward for the new customer (discount on first order)
  rewardType: "FIXED" as const, // FIXED or PERCENTAGE

  // Code settings
  codePrefix: "FRIEND-",
  codeLength: 6, // Characters after prefix

  // Expiration
  expirationDays: 30, // Referral expires after 30 days if not used

  // Limits
  maxReferralsPerMonth: 50, // Max referrals a customer can make per month
};

// ============================================
// TYPES
// ============================================

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarned: number;
  thisMonthReferrals: number;
  canReferMore: boolean;
}

export interface ReferralInfo {
  id: string;
  referrerId: string;
  refereeId: string | null;
  code: string;
  status: ReferralStatus;
  referrerReward: number;
  refereeReward: number;
  createdAt: Date;
  completedAt: Date | null;
  referee?: {
    id: string;
    name: string;
    phone: string;
  };
}

// ============================================
// CODE GENERATION
// ============================================

/**
 * Generate a random alphanumeric code
 */
function generateRandomCode(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid confusing chars: 0OIl1
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get or create a referral code for a customer
 */
export async function getOrCreateReferralCode(
  customerId: string
): Promise<string> {
  // Check if customer already has a code
  const existing = await prisma.referralCode.findUnique({
    where: { customerId },
  });

  if (existing) {
    return existing.code;
  }

  // Generate new unique code
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = `${REFERRAL_CONFIG.codePrefix}${generateRandomCode(REFERRAL_CONFIG.codeLength)}`;
    const exists = await prisma.referralCode.findUnique({
      where: { code },
    });
    if (!exists) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new Error("Failed to generate unique referral code");
  }

  // Create the code
  await prisma.referralCode.create({
    data: {
      customerId,
      code,
    },
  });

  return code;
}

/**
 * Get referral code info for a customer
 */
export async function getReferralCodeInfo(customerId: string) {
  const referralCode = await prisma.referralCode.findUnique({
    where: { customerId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return referralCode;
}

// ============================================
// REFERRAL TRACKING
// ============================================

/**
 * Validate and apply a referral code for a new customer
 * Returns the referrer info if valid
 */
export async function validateReferralCode(
  code: string,
  refereePhone: string
): Promise<{
  valid: boolean;
  error?: string;
  referrerId?: string;
  refereeDiscount?: number;
}> {
  // Find the referral code
  const referralCode = await prisma.referralCode.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      customer: true,
    },
  });

  if (!referralCode) {
    return { valid: false, error: "Invalid referral code" };
  }

  if (!referralCode.isActive) {
    return { valid: false, error: "This referral code is no longer active" };
  }

  // Check if referee already exists
  const existingCustomer = await prisma.customer.findUnique({
    where: { phone: refereePhone },
  });

  if (existingCustomer) {
    // Check if they've already completed an order
    const hasOrders = await prisma.order.count({
      where: {
        customerId: existingCustomer.id,
        status: { in: ["COMPLETED", "READY", "PREPARING", "CONFIRMED"] },
      },
    });

    if (hasOrders > 0) {
      return {
        valid: false,
        error: "Referral code can only be used by new customers",
      };
    }
  }

  // Check if referrer is trying to refer themselves
  if (referralCode.customer.phone === refereePhone) {
    return { valid: false, error: "You cannot use your own referral code" };
  }

  // Check referrer's monthly limit
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thisMonthReferrals = await prisma.referral.count({
    where: {
      referrerId: referralCode.customerId,
      createdAt: { gte: startOfMonth },
    },
  });

  if (thisMonthReferrals >= REFERRAL_CONFIG.maxReferralsPerMonth) {
    return {
      valid: false,
      error: "This referral code has reached its monthly limit",
    };
  }

  return {
    valid: true,
    referrerId: referralCode.customerId,
    refereeDiscount: REFERRAL_CONFIG.refereeReward,
  };
}

/**
 * Create a pending referral when a new customer uses a code
 */
export async function createPendingReferral(
  referrerId: string,
  refereeId: string | null,
  code: string
): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFERRAL_CONFIG.expirationDays);

  const referral = await prisma.referral.create({
    data: {
      referrerId,
      refereeId,
      code: code.toUpperCase(),
      status: "PENDING",
      referrerReward: 0,
      refereeReward: REFERRAL_CONFIG.refereeReward,
      rewardType: REFERRAL_CONFIG.rewardType,
      expiresAt,
    },
  });

  return referral.id;
}

/**
 * Complete a referral after first purchase
 * Awards both referrer and records the completion
 */
export async function completeReferral(
  referralId: string,
  orderId: string
): Promise<{
  success: boolean;
  referrerReward?: number;
  error?: string;
}> {
  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    include: {
      referrer: true,
    },
  });

  if (!referral) {
    return { success: false, error: "Referral not found" };
  }

  if (referral.status !== "PENDING") {
    return { success: false, error: "Referral is not in pending status" };
  }

  // Check if expired
  if (referral.expiresAt && referral.expiresAt < new Date()) {
    await prisma.referral.update({
      where: { id: referralId },
      data: { status: "EXPIRED" },
    });
    return { success: false, error: "Referral has expired" };
  }

  // Complete the referral
  await prisma.$transaction(async (tx) => {
    // Update referral status
    await tx.referral.update({
      where: { id: referralId },
      data: {
        status: "COMPLETED",
        referrerReward: REFERRAL_CONFIG.referrerReward,
        orderId,
        completedAt: new Date(),
      },
    });

    // Update referral code stats
    await tx.referralCode.update({
      where: { customerId: referral.referrerId },
      data: {
        timesUsed: { increment: 1 },
        totalEarned: {
          increment: REFERRAL_CONFIG.referrerReward,
        },
      },
    });
  });

  return {
    success: true,
    referrerReward: REFERRAL_CONFIG.referrerReward,
  };
}

/**
 * Find pending referral for a customer (used during checkout)
 */
export async function findPendingReferralForCustomer(
  customerId: string
): Promise<{
  referralId: string;
  discount: number;
} | null> {
  const referral = await prisma.referral.findFirst({
    where: {
      refereeId: customerId,
      status: "PENDING",
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!referral) return null;

  return {
    referralId: referral.id,
    discount: Number(referral.refereeReward),
  };
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get referral statistics for a customer
 */
export async function getReferralStats(
  customerId: string
): Promise<ReferralStats> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalReferrals, completedReferrals, pendingReferrals, thisMonthCount, referralCode] =
    await Promise.all([
      prisma.referral.count({
        where: { referrerId: customerId },
      }),
      prisma.referral.count({
        where: { referrerId: customerId, status: "COMPLETED" },
      }),
      prisma.referral.count({
        where: { referrerId: customerId, status: "PENDING" },
      }),
      prisma.referral.count({
        where: {
          referrerId: customerId,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.referralCode.findUnique({
        where: { customerId },
      }),
    ]);

  return {
    totalReferrals,
    completedReferrals,
    pendingReferrals,
    totalEarned: referralCode ? Number(referralCode.totalEarned) : 0,
    thisMonthReferrals: thisMonthCount,
    canReferMore: thisMonthCount < REFERRAL_CONFIG.maxReferralsPerMonth,
  };
}

/**
 * Get referral history for a customer
 */
export async function getReferralHistory(
  customerId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  referrals: ReferralInfo[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}> {
  const skip = (page - 1) * limit;

  const [referrals, totalCount] = await Promise.all([
    prisma.referral.findMany({
      where: { referrerId: customerId },
      include: {
        referee: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.referral.count({
      where: { referrerId: customerId },
    }),
  ]);

  return {
    referrals: referrals.map((r) => ({
      id: r.id,
      referrerId: r.referrerId,
      refereeId: r.refereeId,
      code: r.code,
      status: r.status,
      referrerReward: Number(r.referrerReward),
      refereeReward: Number(r.refereeReward),
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      referee: r.referee || undefined,
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Generate shareable referral link
 */
export function generateReferralLink(code: string, baseUrl: string): string {
  return `${baseUrl}/shop?ref=${encodeURIComponent(code)}`;
}

/**
 * Generate social share messages
 */
export function generateShareMessages(
  code: string,
  referralLink: string,
  language: "en" | "kh" = "en"
): {
  telegram: string;
  facebook: string;
  copy: string;
} {
  const discountAmount = `$${REFERRAL_CONFIG.refereeReward}`;

  if (language === "kh") {
    return {
      telegram: `ប្រើលេខកូដបញ្ចុះតម្លៃរបស់ខ្ញុំ ${code} ដើម្បីទទួលបាន ${discountAmount} ការបញ្ចុះតម្លៃលើការបញ្ជាទិញដំបូងរបស់អ្នក! ${referralLink}`,
      facebook: `ទទួលបាន ${discountAmount} ការបញ្ចុះតម្លៃលើការបញ្ជាទិញដំបូងរបស់អ្នកជាមួយលេខកូដរបស់ខ្ញុំ: ${code}`,
      copy: referralLink,
    };
  }

  return {
    telegram: `Use my referral code ${code} to get ${discountAmount} off your first order! ${referralLink}`,
    facebook: `Get ${discountAmount} off your first order with my code: ${code}`,
    copy: referralLink,
  };
}
