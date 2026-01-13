// Influencer Commission Tracking Service
// Handles influencer management, sales tracking, and payout generation

import prisma from "@/lib/prisma";
import {
  InfluencerSaleStatus,
  PayoutStatus,
  CommissionType,
  InfluencerTier,
  PayoutMethod,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================
// CONFIGURATION
// ============================================

export const INFLUENCER_CONFIG = {
  // Default commission rates by tier
  tierCommissionRates: {
    STANDARD: 10,
    BRONZE: 12,
    SILVER: 15,
    GOLD: 18,
    PLATINUM: 20,
  } as Record<InfluencerTier, number>,

  // Code settings
  codeLength: 6, // Characters for affiliate code

  // Payout settings
  defaultMinPayout: 50, // USD
  payoutCurrency: "USD" as const,
};

// ============================================
// TYPES
// ============================================

export interface InfluencerStats {
  totalSales: number;
  totalCommission: number;
  totalOrders: number;
  pendingPayout: number;
  pendingSales: number;
  approvedSales: number;
  thisMonthSales: number;
  thisMonthCommission: number;
  conversionRate: number; // Orders / Clicks (if tracked)
}

export interface InfluencerSaleInfo {
  id: string;
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  commissionRate: number;
  commissionAmount: number;
  source: string | null;
  status: InfluencerSaleStatus;
  saleDate: Date;
  customer?: {
    name: string;
  };
}

export interface InfluencerPayoutInfo {
  id: string;
  amount: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  salesCount: number;
  totalSales: number;
  status: PayoutStatus;
  payoutMethod: PayoutMethod;
  payoutReference: string | null;
  paidAt: Date | null;
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
 * Generate unique affiliate code from influencer name
 */
export async function generateAffiliateCode(name: string): Promise<string> {
  // Create base from name (first 4 chars uppercase, no spaces)
  const nameBase = name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);

  let code: string;
  let attempts = 0;
  const maxAttempts = 20;

  do {
    // Combine name base with random suffix
    const suffix = generateRandomCode(
      INFLUENCER_CONFIG.codeLength - nameBase.length
    );
    code = nameBase + suffix;

    // Ensure code is unique
    const exists = await prisma.influencer.findUnique({
      where: { affiliateCode: code },
    });
    if (!exists) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    // Fallback to fully random code
    code = generateRandomCode(INFLUENCER_CONFIG.codeLength);
  }

  return code;
}

// ============================================
// INFLUENCER MANAGEMENT
// ============================================

/**
 * Create a new influencer
 */
export async function createInfluencer(data: {
  name: string;
  email: string;
  phone?: string;
  socialPlatforms?: Record<string, string>;
  commissionRate?: number;
  commissionType?: CommissionType;
  tier?: InfluencerTier;
  payoutMethod?: PayoutMethod;
  payoutDetails?: Record<string, string>;
  notes?: string;
}): Promise<string> {
  const affiliateCode = await generateAffiliateCode(data.name);

  const influencer = await prisma.influencer.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      socialPlatforms: data.socialPlatforms || null,
      affiliateCode,
      commissionRate:
        data.commissionRate ??
        INFLUENCER_CONFIG.tierCommissionRates[data.tier || "STANDARD"],
      commissionType: data.commissionType || "PERCENTAGE",
      tier: data.tier || "STANDARD",
      payoutMethod: data.payoutMethod || "BANK_TRANSFER",
      payoutDetails: data.payoutDetails || null,
      notes: data.notes,
    },
  });

  return influencer.id;
}

/**
 * Update an influencer
 */
export async function updateInfluencer(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    socialPlatforms?: Record<string, string>;
    commissionRate?: number;
    commissionType?: CommissionType;
    fixedCommission?: number;
    tier?: InfluencerTier;
    isActive?: boolean;
    isVerified?: boolean;
    payoutMethod?: PayoutMethod;
    payoutDetails?: Record<string, string>;
    minPayoutAmount?: number;
    notes?: string;
  }
): Promise<void> {
  await prisma.influencer.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      socialPlatforms: data.socialPlatforms,
      commissionRate: data.commissionRate,
      commissionType: data.commissionType,
      fixedCommission: data.fixedCommission,
      tier: data.tier,
      isActive: data.isActive,
      isVerified: data.isVerified,
      payoutMethod: data.payoutMethod,
      payoutDetails: data.payoutDetails,
      minPayoutAmount: data.minPayoutAmount,
      notes: data.notes,
    },
  });
}

/**
 * Get influencer by ID
 */
export async function getInfluencer(id: string) {
  return prisma.influencer.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          sales: true,
          payouts: true,
        },
      },
    },
  });
}

/**
 * Get influencer by affiliate code
 */
export async function getInfluencerByCode(code: string) {
  return prisma.influencer.findUnique({
    where: { affiliateCode: code.toUpperCase() },
  });
}

/**
 * Validate affiliate code for order attribution
 */
export async function validateAffiliateCode(
  code: string
): Promise<{
  valid: boolean;
  error?: string;
  influencerId?: string;
  commissionRate?: number;
  commissionType?: CommissionType;
  fixedCommission?: number;
}> {
  const influencer = await prisma.influencer.findUnique({
    where: { affiliateCode: code.toUpperCase() },
  });

  if (!influencer) {
    return { valid: false, error: "Invalid affiliate code" };
  }

  if (!influencer.isActive) {
    return { valid: false, error: "This affiliate code is no longer active" };
  }

  return {
    valid: true,
    influencerId: influencer.id,
    commissionRate: Number(influencer.commissionRate),
    commissionType: influencer.commissionType,
    fixedCommission: Number(influencer.fixedCommission),
  };
}

// ============================================
// SALES TRACKING
// ============================================

/**
 * Record a sale attributed to an influencer
 */
export async function recordInfluencerSale(data: {
  influencerId: string;
  orderId: string;
  orderTotal: number;
  affiliateCode: string;
  source?: string;
}): Promise<string> {
  const influencer = await prisma.influencer.findUnique({
    where: { id: data.influencerId },
  });

  if (!influencer) {
    throw new Error("Influencer not found");
  }

  // Calculate commission
  let commissionAmount: number;
  if (influencer.commissionType === "FIXED") {
    commissionAmount = Number(influencer.fixedCommission);
  } else {
    commissionAmount =
      (data.orderTotal * Number(influencer.commissionRate)) / 100;
  }

  // Create sale record
  const sale = await prisma.influencerSale.create({
    data: {
      influencerId: data.influencerId,
      orderId: data.orderId,
      orderTotal: data.orderTotal,
      commissionRate: influencer.commissionRate,
      commissionAmount,
      affiliateCode: data.affiliateCode.toUpperCase(),
      source: data.source,
      status: "PENDING",
    },
  });

  return sale.id;
}

/**
 * Approve a sale (order completed/delivered)
 */
export async function approveInfluencerSale(saleId: string): Promise<void> {
  const sale = await prisma.influencerSale.findUnique({
    where: { id: saleId },
    include: { influencer: true },
  });

  if (!sale) {
    throw new Error("Sale not found");
  }

  if (sale.status !== "PENDING") {
    throw new Error("Sale is not in pending status");
  }

  await prisma.$transaction(async (tx) => {
    // Update sale status
    await tx.influencerSale.update({
      where: { id: saleId },
      data: { status: "APPROVED" },
    });

    // Update influencer stats
    await tx.influencer.update({
      where: { id: sale.influencerId },
      data: {
        totalSales: { increment: Number(sale.orderTotal) },
        totalCommission: { increment: Number(sale.commissionAmount) },
        totalOrders: { increment: 1 },
        pendingPayout: { increment: Number(sale.commissionAmount) },
      },
    });
  });
}

/**
 * Reject a sale (order cancelled/returned)
 */
export async function rejectInfluencerSale(saleId: string): Promise<void> {
  const sale = await prisma.influencerSale.findUnique({
    where: { id: saleId },
  });

  if (!sale) {
    throw new Error("Sale not found");
  }

  if (sale.status !== "PENDING" && sale.status !== "APPROVED") {
    throw new Error("Sale cannot be rejected");
  }

  const wasApproved = sale.status === "APPROVED";

  await prisma.$transaction(async (tx) => {
    // Update sale status
    await tx.influencerSale.update({
      where: { id: saleId },
      data: { status: "REJECTED" },
    });

    // If was approved, reverse the stats
    if (wasApproved) {
      await tx.influencer.update({
        where: { id: sale.influencerId },
        data: {
          totalSales: { decrement: Number(sale.orderTotal) },
          totalCommission: { decrement: Number(sale.commissionAmount) },
          totalOrders: { decrement: 1 },
          pendingPayout: { decrement: Number(sale.commissionAmount) },
        },
      });
    }
  });
}

/**
 * Get sales for an influencer
 */
export async function getInfluencerSales(
  influencerId: string,
  options: {
    page?: number;
    limit?: number;
    status?: InfluencerSaleStatus;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{
  sales: InfluencerSaleInfo[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: Parameters<typeof prisma.influencerSale.findMany>[0]["where"] = {
    influencerId,
  };

  if (options.status) {
    where.status = options.status;
  }

  if (options.startDate || options.endDate) {
    where.saleDate = {};
    if (options.startDate) where.saleDate.gte = options.startDate;
    if (options.endDate) where.saleDate.lte = options.endDate;
  }

  const [sales, totalCount] = await Promise.all([
    prisma.influencerSale.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            customer: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { saleDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.influencerSale.count({ where }),
  ]);

  return {
    sales: sales.map((s) => ({
      id: s.id,
      orderId: s.orderId,
      orderNumber: s.order.orderNumber,
      orderTotal: Number(s.orderTotal),
      commissionRate: Number(s.commissionRate),
      commissionAmount: Number(s.commissionAmount),
      source: s.source,
      status: s.status,
      saleDate: s.saleDate,
      customer: s.order.customer
        ? { name: s.order.customer.name }
        : undefined,
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get statistics for an influencer
 */
export async function getInfluencerStats(
  influencerId: string
): Promise<InfluencerStats> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
  });

  if (!influencer) {
    throw new Error("Influencer not found");
  }

  const [pendingSales, approvedSales, thisMonthData] = await Promise.all([
    prisma.influencerSale.count({
      where: { influencerId, status: "PENDING" },
    }),
    prisma.influencerSale.count({
      where: { influencerId, status: "APPROVED" },
    }),
    prisma.influencerSale.aggregate({
      where: {
        influencerId,
        saleDate: { gte: startOfMonth },
        status: { in: ["APPROVED", "PAID"] },
      },
      _sum: {
        orderTotal: true,
        commissionAmount: true,
      },
      _count: true,
    }),
  ]);

  return {
    totalSales: Number(influencer.totalSales),
    totalCommission: Number(influencer.totalCommission),
    totalOrders: influencer.totalOrders,
    pendingPayout: Number(influencer.pendingPayout),
    pendingSales,
    approvedSales,
    thisMonthSales: Number(thisMonthData._sum.orderTotal || 0),
    thisMonthCommission: Number(thisMonthData._sum.commissionAmount || 0),
    conversionRate: 0, // Would need click tracking
  };
}

// ============================================
// PAYOUTS
// ============================================

/**
 * Generate a payout report for an influencer
 */
export async function generatePayoutReport(
  influencerId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  influencerName: string;
  email: string;
  affiliateCode: string;
  period: { start: Date; end: Date };
  sales: Array<{
    orderNumber: string;
    orderTotal: number;
    commissionAmount: number;
    saleDate: Date;
  }>;
  summary: {
    salesCount: number;
    totalSales: number;
    totalCommission: number;
  };
  payoutMethod: PayoutMethod;
  payoutDetails: Record<string, string> | null;
}> {
  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
  });

  if (!influencer) {
    throw new Error("Influencer not found");
  }

  const sales = await prisma.influencerSale.findMany({
    where: {
      influencerId,
      status: "APPROVED",
      payoutId: null,
      saleDate: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      order: {
        select: { orderNumber: true },
      },
    },
    orderBy: { saleDate: "asc" },
  });

  const totalSales = sales.reduce(
    (sum, s) => sum + Number(s.orderTotal),
    0
  );
  const totalCommission = sales.reduce(
    (sum, s) => sum + Number(s.commissionAmount),
    0
  );

  return {
    influencerName: influencer.name,
    email: influencer.email,
    affiliateCode: influencer.affiliateCode,
    period: { start: periodStart, end: periodEnd },
    sales: sales.map((s) => ({
      orderNumber: s.order.orderNumber,
      orderTotal: Number(s.orderTotal),
      commissionAmount: Number(s.commissionAmount),
      saleDate: s.saleDate,
    })),
    summary: {
      salesCount: sales.length,
      totalSales,
      totalCommission,
    },
    payoutMethod: influencer.payoutMethod,
    payoutDetails: influencer.payoutDetails as Record<string, string> | null,
  };
}

/**
 * Create a payout for an influencer
 */
export async function createPayout(data: {
  influencerId: string;
  periodStart: Date;
  periodEnd: Date;
  processedBy?: string;
}): Promise<string> {
  const influencer = await prisma.influencer.findUnique({
    where: { id: data.influencerId },
  });

  if (!influencer) {
    throw new Error("Influencer not found");
  }

  // Get unpaid approved sales in the period
  const sales = await prisma.influencerSale.findMany({
    where: {
      influencerId: data.influencerId,
      status: "APPROVED",
      payoutId: null,
      saleDate: {
        gte: data.periodStart,
        lte: data.periodEnd,
      },
    },
  });

  if (sales.length === 0) {
    throw new Error("No unpaid sales in the specified period");
  }

  const totalSales = sales.reduce(
    (sum, s) => sum + Number(s.orderTotal),
    0
  );
  const totalCommission = sales.reduce(
    (sum, s) => sum + Number(s.commissionAmount),
    0
  );

  if (totalCommission < Number(influencer.minPayoutAmount)) {
    throw new Error(
      `Commission ($${totalCommission.toFixed(2)}) is below minimum payout amount ($${Number(influencer.minPayoutAmount).toFixed(2)})`
    );
  }

  // Create payout and update sales in transaction
  const payout = await prisma.$transaction(async (tx) => {
    const newPayout = await tx.influencerPayout.create({
      data: {
        influencerId: data.influencerId,
        amount: totalCommission,
        currency: INFLUENCER_CONFIG.payoutCurrency,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        salesCount: sales.length,
        totalSales,
        payoutMethod: influencer.payoutMethod,
        status: "PENDING",
      },
    });

    // Link sales to payout
    await tx.influencerSale.updateMany({
      where: {
        id: { in: sales.map((s) => s.id) },
      },
      data: {
        payoutId: newPayout.id,
      },
    });

    return newPayout;
  });

  return payout.id;
}

/**
 * Process a payout (mark as completed)
 */
export async function processPayout(
  payoutId: string,
  data: {
    payoutReference?: string;
    paidBy?: string;
    notes?: string;
  }
): Promise<void> {
  const payout = await prisma.influencerPayout.findUnique({
    where: { id: payoutId },
    include: { influencer: true },
  });

  if (!payout) {
    throw new Error("Payout not found");
  }

  if (payout.status === "COMPLETED") {
    throw new Error("Payout is already completed");
  }

  await prisma.$transaction(async (tx) => {
    // Update payout
    await tx.influencerPayout.update({
      where: { id: payoutId },
      data: {
        status: "COMPLETED",
        payoutReference: data.payoutReference,
        paidAt: new Date(),
        paidBy: data.paidBy,
        notes: data.notes,
      },
    });

    // Update sales to PAID status
    await tx.influencerSale.updateMany({
      where: { payoutId },
      data: { status: "PAID" },
    });

    // Update influencer pending payout
    await tx.influencer.update({
      where: { id: payout.influencerId },
      data: {
        pendingPayout: { decrement: Number(payout.amount) },
      },
    });
  });
}

/**
 * Get payouts for an influencer
 */
export async function getInfluencerPayouts(
  influencerId: string,
  options: {
    page?: number;
    limit?: number;
    status?: PayoutStatus;
  } = {}
): Promise<{
  payouts: InfluencerPayoutInfo[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: Parameters<typeof prisma.influencerPayout.findMany>[0]["where"] =
    { influencerId };

  if (options.status) {
    where.status = options.status;
  }

  const [payouts, totalCount] = await Promise.all([
    prisma.influencerPayout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.influencerPayout.count({ where }),
  ]);

  return {
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      salesCount: p.salesCount,
      totalSales: Number(p.totalSales),
      status: p.status,
      payoutMethod: p.payoutMethod,
      payoutReference: p.payoutReference,
      paidAt: p.paidAt,
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * List all influencers with filtering
 */
export async function listInfluencers(options: {
  page?: number;
  limit?: number;
  search?: string;
  tier?: InfluencerTier;
  isActive?: boolean;
  sortBy?: "name" | "totalSales" | "totalCommission" | "joinedAt";
  sortOrder?: "asc" | "desc";
} = {}): Promise<{
  influencers: Array<{
    id: string;
    name: string;
    email: string;
    affiliateCode: string;
    tier: InfluencerTier;
    commissionRate: number;
    isActive: boolean;
    isVerified: boolean;
    totalSales: number;
    totalCommission: number;
    totalOrders: number;
    pendingPayout: number;
    joinedAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: Parameters<typeof prisma.influencer.findMany>[0]["where"] = {};

  if (options.search) {
    where.OR = [
      { name: { contains: options.search, mode: "insensitive" } },
      { email: { contains: options.search, mode: "insensitive" } },
      { affiliateCode: { contains: options.search.toUpperCase() } },
    ];
  }

  if (options.tier) {
    where.tier = options.tier;
  }

  if (options.isActive !== undefined) {
    where.isActive = options.isActive;
  }

  const orderBy: Parameters<typeof prisma.influencer.findMany>[0]["orderBy"] =
    {};
  const sortBy = options.sortBy || "joinedAt";
  const sortOrder = options.sortOrder || "desc";
  orderBy[sortBy] = sortOrder;

  const [influencers, totalCount] = await Promise.all([
    prisma.influencer.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.influencer.count({ where }),
  ]);

  return {
    influencers: influencers.map((i) => ({
      id: i.id,
      name: i.name,
      email: i.email,
      affiliateCode: i.affiliateCode,
      tier: i.tier,
      commissionRate: Number(i.commissionRate),
      isActive: i.isActive,
      isVerified: i.isVerified,
      totalSales: Number(i.totalSales),
      totalCommission: Number(i.totalCommission),
      totalOrders: i.totalOrders,
      pendingPayout: Number(i.pendingPayout),
      joinedAt: i.joinedAt,
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
 * Get admin dashboard summary
 */
export async function getInfluencerDashboardSummary(): Promise<{
  totalInfluencers: number;
  activeInfluencers: number;
  totalSales: number;
  totalCommission: number;
  pendingPayouts: number;
  pendingPayoutAmount: number;
  thisMonthSales: number;
  thisMonthCommission: number;
  topInfluencers: Array<{
    id: string;
    name: string;
    affiliateCode: string;
    totalSales: number;
    totalCommission: number;
  }>;
}> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalInfluencers,
    activeInfluencers,
    salesAggregate,
    pendingPayouts,
    thisMonthSales,
    topInfluencers,
  ] = await Promise.all([
    prisma.influencer.count(),
    prisma.influencer.count({ where: { isActive: true } }),
    prisma.influencer.aggregate({
      _sum: {
        totalSales: true,
        totalCommission: true,
        pendingPayout: true,
      },
    }),
    prisma.influencerPayout.count({
      where: { status: "PENDING" },
    }),
    prisma.influencerSale.aggregate({
      where: {
        saleDate: { gte: startOfMonth },
        status: { in: ["APPROVED", "PAID"] },
      },
      _sum: {
        orderTotal: true,
        commissionAmount: true,
      },
    }),
    prisma.influencer.findMany({
      where: { isActive: true },
      orderBy: { totalSales: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        affiliateCode: true,
        totalSales: true,
        totalCommission: true,
      },
    }),
  ]);

  return {
    totalInfluencers,
    activeInfluencers,
    totalSales: Number(salesAggregate._sum.totalSales || 0),
    totalCommission: Number(salesAggregate._sum.totalCommission || 0),
    pendingPayouts,
    pendingPayoutAmount: Number(salesAggregate._sum.pendingPayout || 0),
    thisMonthSales: Number(thisMonthSales._sum.orderTotal || 0),
    thisMonthCommission: Number(thisMonthSales._sum.commissionAmount || 0),
    topInfluencers: topInfluencers.map((i) => ({
      id: i.id,
      name: i.name,
      affiliateCode: i.affiliateCode,
      totalSales: Number(i.totalSales),
      totalCommission: Number(i.totalCommission),
    })),
  };
}

/**
 * Generate shareable affiliate link
 */
export function generateAffiliateLink(code: string, baseUrl: string): string {
  return `${baseUrl}/shop?aff=${encodeURIComponent(code)}`;
}

/**
 * Export payout report as CSV
 */
export function generatePayoutReportCSV(report: Awaited<ReturnType<typeof generatePayoutReport>>): string {
  const lines: string[] = [];

  // Header
  lines.push("Influencer Payout Report");
  lines.push(`Name,${report.influencerName}`);
  lines.push(`Email,${report.email}`);
  lines.push(`Affiliate Code,${report.affiliateCode}`);
  lines.push(`Period,${report.period.start.toISOString().split("T")[0]} to ${report.period.end.toISOString().split("T")[0]}`);
  lines.push("");

  // Sales detail header
  lines.push("Order Number,Sale Date,Order Total,Commission");

  // Sales rows
  for (const sale of report.sales) {
    lines.push(
      `${sale.orderNumber},${sale.saleDate.toISOString().split("T")[0]},$${sale.orderTotal.toFixed(2)},$${sale.commissionAmount.toFixed(2)}`
    );
  }

  lines.push("");
  lines.push("Summary");
  lines.push(`Total Sales,$${report.summary.totalSales.toFixed(2)}`);
  lines.push(`Total Commission,$${report.summary.totalCommission.toFixed(2)}`);
  lines.push(`Sales Count,${report.summary.salesCount}`);

  return lines.join("\n");
}
