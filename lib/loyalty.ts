// Loyalty Program Service
// Points-based rewards system for ApoloShop

import prisma from "./prisma";

// ============================================
// CONFIGURATION
// ============================================

// Points earning rate: 1 point per $1 spent
export const POINTS_PER_DOLLAR = 1;

// Point value when redeeming: 100 points = $1 discount
export const POINTS_REDEMPTION_RATE = 100; // points per $1

// Minimum points required to redeem
export const MIN_REDEEM_POINTS = 100;

// Points expiry: 12 months
export const POINTS_EXPIRY_MONTHS = 12;

// Tier configuration
export const LOYALTY_TIERS = {
  BRONZE: {
    name: "Bronze",
    nameKh: "សំរិទ្ធ",
    minLifetimePoints: 0,
    multiplier: 1.0,
    color: "#CD7F32",
  },
  SILVER: {
    name: "Silver",
    nameKh: "ប្រាក់",
    minLifetimePoints: 500,
    multiplier: 1.25,
    color: "#C0C0C0",
  },
  GOLD: {
    name: "Gold",
    nameKh: "មាស",
    minLifetimePoints: 2000,
    multiplier: 1.5,
    color: "#FFD700",
  },
  PLATINUM: {
    name: "Platinum",
    nameKh: "ផ្លាទីន",
    minLifetimePoints: 5000,
    multiplier: 2.0,
    color: "#E5E4E2",
  },
} as const;

export type LoyaltyTierKey = keyof typeof LOYALTY_TIERS;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate the tier based on lifetime points
 */
export function calculateTier(lifetimePoints: number): LoyaltyTierKey {
  if (lifetimePoints >= LOYALTY_TIERS.PLATINUM.minLifetimePoints) {
    return "PLATINUM";
  }
  if (lifetimePoints >= LOYALTY_TIERS.GOLD.minLifetimePoints) {
    return "GOLD";
  }
  if (lifetimePoints >= LOYALTY_TIERS.SILVER.minLifetimePoints) {
    return "SILVER";
  }
  return "BRONZE";
}

/**
 * Get tier multiplier for point earning
 */
export function getTierMultiplier(tier: LoyaltyTierKey): number {
  return LOYALTY_TIERS[tier].multiplier;
}

/**
 * Calculate points to earn from a purchase amount (in USD)
 */
export function calculateEarnedPoints(
  amountUsd: number,
  tier: LoyaltyTierKey
): number {
  const basePoints = Math.floor(amountUsd * POINTS_PER_DOLLAR);
  const multiplier = getTierMultiplier(tier);
  return Math.floor(basePoints * multiplier);
}

/**
 * Calculate discount value from points (in USD)
 */
export function calculateRedemptionValue(points: number): number {
  return points / POINTS_REDEMPTION_RATE;
}

/**
 * Calculate points needed for a specific discount amount
 */
export function calculatePointsNeeded(discountUsd: number): number {
  return Math.ceil(discountUsd * POINTS_REDEMPTION_RATE);
}

/**
 * Get expiry date for new points (12 months from now)
 */
export function getPointsExpiryDate(): Date {
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + POINTS_EXPIRY_MONTHS);
  return expiryDate;
}

/**
 * Get points until next tier
 */
export function getPointsToNextTier(
  lifetimePoints: number,
  currentTier: LoyaltyTierKey
): { nextTier: LoyaltyTierKey | null; pointsNeeded: number } {
  const tierOrder: LoyaltyTierKey[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
  const currentIndex = tierOrder.indexOf(currentTier);

  if (currentIndex >= tierOrder.length - 1) {
    return { nextTier: null, pointsNeeded: 0 };
  }

  const nextTier = tierOrder[currentIndex + 1];
  const pointsNeeded =
    LOYALTY_TIERS[nextTier].minLifetimePoints - lifetimePoints;

  return { nextTier, pointsNeeded: Math.max(0, pointsNeeded) };
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Get or create loyalty account for a customer
 */
export async function getOrCreateLoyaltyAccount(customerId: string) {
  let account = await prisma.loyaltyAccount.findUnique({
    where: { customerId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!account) {
    account = await prisma.loyaltyAccount.create({
      data: {
        customerId,
        currentPoints: 0,
        lifetimePoints: 0,
        tier: "BRONZE",
      },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  }

  return account;
}

/**
 * Get loyalty account with full transaction history
 */
export async function getLoyaltyAccountWithHistory(
  customerId: string,
  page: number = 1,
  limit: number = 20
) {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { customerId },
  });

  if (!account) {
    return null;
  }

  const [transactions, totalCount] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.loyaltyTransaction.count({
      where: { accountId: account.id },
    }),
  ]);

  return {
    account,
    transactions,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Earn points from a purchase
 */
export async function earnPoints(
  customerId: string,
  amountUsd: number,
  orderId: string,
  description?: string
): Promise<{ pointsEarned: number; newTier: LoyaltyTierKey | null }> {
  const account = await getOrCreateLoyaltyAccount(customerId);
  const pointsToEarn = calculateEarnedPoints(amountUsd, account.tier);
  const expiresAt = getPointsExpiryDate();

  // Calculate new lifetime points and potential tier upgrade
  const newLifetimePoints = account.lifetimePoints + pointsToEarn;
  const newTier = calculateTier(newLifetimePoints);
  const tierUpgraded = newTier !== account.tier;

  // Create transaction and update account in a transaction
  await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: "EARN",
        points: pointsToEarn,
        orderId,
        description: description || `Earned from order ${orderId}`,
        expiresAt,
        metadata: {
          amountUsd,
          tier: account.tier,
          multiplier: getTierMultiplier(account.tier),
        },
      },
    }),
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        currentPoints: { increment: pointsToEarn },
        lifetimePoints: { increment: pointsToEarn },
        ...(tierUpgraded && {
          tier: newTier,
          tierUpdatedAt: new Date(),
        }),
      },
    }),
  ]);

  return {
    pointsEarned: pointsToEarn,
    newTier: tierUpgraded ? newTier : null,
  };
}

/**
 * Redeem points for a discount
 */
export async function redeemPoints(
  customerId: string,
  pointsToRedeem: number,
  orderId?: string,
  description?: string
): Promise<{ discountUsd: number; remainingPoints: number }> {
  if (pointsToRedeem < MIN_REDEEM_POINTS) {
    throw new Error(
      `Minimum ${MIN_REDEEM_POINTS} points required for redemption`
    );
  }

  const account = await prisma.loyaltyAccount.findUnique({
    where: { customerId },
  });

  if (!account) {
    throw new Error("Loyalty account not found");
  }

  if (account.currentPoints < pointsToRedeem) {
    throw new Error(
      `Insufficient points. Available: ${account.currentPoints}, Requested: ${pointsToRedeem}`
    );
  }

  const discountUsd = calculateRedemptionValue(pointsToRedeem);

  // Create transaction and update account
  await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: "REDEEM",
        points: -pointsToRedeem, // Negative for redemption
        orderId,
        description: description || `Redeemed for $${discountUsd.toFixed(2)} discount`,
        metadata: {
          discountUsd,
          redemptionRate: POINTS_REDEMPTION_RATE,
        },
      },
    }),
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        currentPoints: { decrement: pointsToRedeem },
      },
    }),
  ]);

  return {
    discountUsd,
    remainingPoints: account.currentPoints - pointsToRedeem,
  };
}

/**
 * Add bonus points (promotions, birthday, etc.)
 */
export async function addBonusPoints(
  customerId: string,
  points: number,
  description: string,
  createdBy?: string
): Promise<void> {
  const account = await getOrCreateLoyaltyAccount(customerId);
  const expiresAt = getPointsExpiryDate();

  // Calculate new lifetime points and potential tier upgrade
  const newLifetimePoints = account.lifetimePoints + points;
  const newTier = calculateTier(newLifetimePoints);
  const tierUpgraded = newTier !== account.tier;

  await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: "BONUS",
        points,
        description,
        expiresAt,
        createdBy,
        metadata: { reason: description },
      },
    }),
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        currentPoints: { increment: points },
        lifetimePoints: { increment: points },
        ...(tierUpgraded && {
          tier: newTier,
          tierUpdatedAt: new Date(),
        }),
      },
    }),
  ]);
}

/**
 * Refund points for a cancelled/refunded order
 */
export async function refundPoints(
  customerId: string,
  orderId: string
): Promise<{ pointsRefunded: number }> {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { customerId },
  });

  if (!account) {
    return { pointsRefunded: 0 };
  }

  // Find the original EARN transaction for this order
  const earnTransaction = await prisma.loyaltyTransaction.findFirst({
    where: {
      accountId: account.id,
      orderId,
      type: "EARN",
    },
  });

  if (!earnTransaction) {
    return { pointsRefunded: 0 };
  }

  // Check if already refunded
  const existingRefund = await prisma.loyaltyTransaction.findFirst({
    where: {
      accountId: account.id,
      orderId,
      type: "REFUND",
    },
  });

  if (existingRefund) {
    return { pointsRefunded: 0 };
  }

  const pointsToRefund = earnTransaction.points;

  await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: "REFUND",
        points: -pointsToRefund, // Negative to deduct
        orderId,
        description: `Points refunded for cancelled order ${orderId}`,
        metadata: { originalTransactionId: earnTransaction.id },
      },
    }),
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        currentPoints: { decrement: pointsToRefund },
        lifetimePoints: { decrement: pointsToRefund },
      },
    }),
  ]);

  // Note: We don't recalculate tier on refund to avoid demoting customers

  return { pointsRefunded: pointsToRefund };
}

/**
 * Expire old points (should be run as a scheduled job)
 */
export async function processExpiredPoints(): Promise<{
  accountsProcessed: number;
  totalPointsExpired: number;
}> {
  const now = new Date();

  // Find all unexpired transactions that have passed their expiry date
  const expiredTransactions = await prisma.loyaltyTransaction.findMany({
    where: {
      type: { in: ["EARN", "BONUS"] },
      isExpired: false,
      expiresAt: { lt: now },
    },
    include: {
      account: true,
    },
  });

  // Group by account to process efficiently
  const accountExpiries = new Map<
    string,
    { accountId: string; totalExpired: number; transactions: string[] }
  >();

  for (const tx of expiredTransactions) {
    const existing = accountExpiries.get(tx.accountId);
    if (existing) {
      existing.totalExpired += tx.points;
      existing.transactions.push(tx.id);
    } else {
      accountExpiries.set(tx.accountId, {
        accountId: tx.accountId,
        totalExpired: tx.points,
        transactions: [tx.id],
      });
    }
  }

  let totalPointsExpired = 0;

  // Process each account
  for (const [, expiry] of accountExpiries) {
    const account = await prisma.loyaltyAccount.findUnique({
      where: { id: expiry.accountId },
    });

    if (!account) continue;

    // Only expire points up to current balance (in case of partial redemptions)
    const pointsToExpire = Math.min(expiry.totalExpired, account.currentPoints);

    if (pointsToExpire > 0) {
      await prisma.$transaction([
        // Mark transactions as expired
        prisma.loyaltyTransaction.updateMany({
          where: { id: { in: expiry.transactions } },
          data: { isExpired: true },
        }),
        // Create expiry transaction
        prisma.loyaltyTransaction.create({
          data: {
            accountId: expiry.accountId,
            type: "EXPIRE",
            points: -pointsToExpire,
            description: `${pointsToExpire} points expired`,
            metadata: {
              expiredTransactions: expiry.transactions,
            },
          },
        }),
        // Update account balance
        prisma.loyaltyAccount.update({
          where: { id: expiry.accountId },
          data: {
            currentPoints: { decrement: pointsToExpire },
          },
        }),
      ]);

      totalPointsExpired += pointsToExpire;
    }
  }

  return {
    accountsProcessed: accountExpiries.size,
    totalPointsExpired,
  };
}

/**
 * Admin: Adjust points manually
 */
export async function adjustPoints(
  customerId: string,
  points: number, // Can be positive or negative
  description: string,
  createdBy: string
): Promise<void> {
  const account = await getOrCreateLoyaltyAccount(customerId);

  // For negative adjustments, ensure we don't go below zero
  if (points < 0 && account.currentPoints + points < 0) {
    throw new Error(
      `Cannot deduct more points than available. Current: ${account.currentPoints}, Adjustment: ${points}`
    );
  }

  await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: "ADJUSTMENT",
        points,
        description,
        createdBy,
        metadata: { adminAdjustment: true },
      },
    }),
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        currentPoints: { increment: points },
        // Only add to lifetime for positive adjustments
        ...(points > 0 && { lifetimePoints: { increment: points } }),
      },
    }),
  ]);
}

/**
 * Get loyalty program statistics for admin dashboard
 */
export async function getLoyaltyStats() {
  const [
    totalAccounts,
    tierCounts,
    totalPointsIssued,
    totalPointsRedeemed,
    recentTransactions,
  ] = await Promise.all([
    prisma.loyaltyAccount.count(),
    prisma.loyaltyAccount.groupBy({
      by: ["tier"],
      _count: true,
    }),
    prisma.loyaltyTransaction.aggregate({
      where: { type: "EARN" },
      _sum: { points: true },
    }),
    prisma.loyaltyTransaction.aggregate({
      where: { type: "REDEEM" },
      _sum: { points: true },
    }),
    prisma.loyaltyTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        account: {
          select: { customerId: true },
        },
      },
    }),
  ]);

  return {
    totalAccounts,
    tierDistribution: tierCounts.reduce(
      (acc, item) => {
        acc[item.tier] = item._count;
        return acc;
      },
      {} as Record<string, number>
    ),
    totalPointsIssued: totalPointsIssued._sum.points || 0,
    totalPointsRedeemed: Math.abs(totalPointsRedeemed._sum.points || 0),
    recentTransactions,
  };
}
