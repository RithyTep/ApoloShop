// Loyalty Program API Endpoints
// GET - Get loyalty account balance and info
// POST - Earn or redeem points

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getOrCreateLoyaltyAccount,
  getLoyaltyAccountWithHistory,
  earnPoints,
  redeemPoints,
  calculateRedemptionValue,
  calculatePointsNeeded,
  getPointsToNextTier,
  LOYALTY_TIERS,
  MIN_REDEEM_POINTS,
  POINTS_REDEMPTION_RATE,
  type LoyaltyTierKey,
} from "@/lib/loyalty";

// GET /api/loyalty - Get loyalty account for a customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const phone = searchParams.get("phone");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const includeHistory = searchParams.get("includeHistory") === "true";

    // Must provide either customerId or phone
    if (!customerId && !phone) {
      return NextResponse.json(
        { error: "customerId or phone is required" },
        { status: 400 }
      );
    }

    // Look up customer if phone provided
    let resolvedCustomerId = customerId;
    if (phone && !customerId) {
      const customer = await prisma.customer.findUnique({
        where: { phone },
        select: { id: true },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
      resolvedCustomerId = customer.id;
    }

    if (!resolvedCustomerId) {
      return NextResponse.json(
        { error: "Could not resolve customer" },
        { status: 400 }
      );
    }

    // Get account with optional history
    if (includeHistory) {
      const result = await getLoyaltyAccountWithHistory(
        resolvedCustomerId,
        page,
        limit
      );

      if (!result) {
        // Create account if doesn't exist
        const account = await getOrCreateLoyaltyAccount(resolvedCustomerId);
        return NextResponse.json({
          account: {
            ...account,
            tierInfo: LOYALTY_TIERS[account.tier as LoyaltyTierKey],
            nextTier: getPointsToNextTier(
              account.lifetimePoints,
              account.tier as LoyaltyTierKey
            ),
            redemptionInfo: {
              minPoints: MIN_REDEEM_POINTS,
              rate: POINTS_REDEMPTION_RATE,
              availableDiscount: calculateRedemptionValue(account.currentPoints),
            },
          },
          transactions: [],
          pagination: {
            page: 1,
            limit,
            totalCount: 0,
            totalPages: 0,
          },
        });
      }

      return NextResponse.json({
        account: {
          ...result.account,
          tierInfo: LOYALTY_TIERS[result.account.tier as LoyaltyTierKey],
          nextTier: getPointsToNextTier(
            result.account.lifetimePoints,
            result.account.tier as LoyaltyTierKey
          ),
          redemptionInfo: {
            minPoints: MIN_REDEEM_POINTS,
            rate: POINTS_REDEMPTION_RATE,
            availableDiscount: calculateRedemptionValue(
              result.account.currentPoints
            ),
          },
        },
        transactions: result.transactions,
        pagination: result.pagination,
      });
    }

    // Simple account fetch
    const account = await getOrCreateLoyaltyAccount(resolvedCustomerId);

    return NextResponse.json({
      account: {
        ...account,
        tierInfo: LOYALTY_TIERS[account.tier as LoyaltyTierKey],
        nextTier: getPointsToNextTier(
          account.lifetimePoints,
          account.tier as LoyaltyTierKey
        ),
        redemptionInfo: {
          minPoints: MIN_REDEEM_POINTS,
          rate: POINTS_REDEMPTION_RATE,
          availableDiscount: calculateRedemptionValue(account.currentPoints),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching loyalty account:", error);
    return NextResponse.json(
      { error: "Failed to fetch loyalty account" },
      { status: 500 }
    );
  }
}

// POST /api/loyalty - Earn or redeem points
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, customerId, phone } = body;

    if (!action) {
      return NextResponse.json(
        { error: "action is required (earn, redeem)" },
        { status: 400 }
      );
    }

    // Resolve customer
    let resolvedCustomerId = customerId;
    if (phone && !customerId) {
      const customer = await prisma.customer.findUnique({
        where: { phone },
        select: { id: true },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
      resolvedCustomerId = customer.id;
    }

    if (!resolvedCustomerId) {
      return NextResponse.json(
        { error: "customerId or phone is required" },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (action) {
      case "earn": {
        const { amountUsd, orderId, description } = body;

        if (!amountUsd || amountUsd <= 0) {
          return NextResponse.json(
            { error: "amountUsd must be a positive number" },
            { status: 400 }
          );
        }

        if (!orderId) {
          return NextResponse.json(
            { error: "orderId is required for earning points" },
            { status: 400 }
          );
        }

        const result = await earnPoints(
          resolvedCustomerId,
          amountUsd,
          orderId,
          description
        );

        // Get updated account
        const account = await getOrCreateLoyaltyAccount(resolvedCustomerId);

        return NextResponse.json({
          success: true,
          pointsEarned: result.pointsEarned,
          tierUpgrade: result.newTier
            ? {
                newTier: result.newTier,
                tierInfo: LOYALTY_TIERS[result.newTier],
              }
            : null,
          account: {
            currentPoints: account.currentPoints,
            lifetimePoints: account.lifetimePoints,
            tier: account.tier,
            tierInfo: LOYALTY_TIERS[account.tier as LoyaltyTierKey],
          },
        });
      }

      case "redeem": {
        const { points, orderId, description } = body;

        if (!points || points <= 0) {
          return NextResponse.json(
            { error: "points must be a positive number" },
            { status: 400 }
          );
        }

        if (points < MIN_REDEEM_POINTS) {
          return NextResponse.json(
            { error: `Minimum ${MIN_REDEEM_POINTS} points required for redemption` },
            { status: 400 }
          );
        }

        try {
          const result = await redeemPoints(
            resolvedCustomerId,
            points,
            orderId,
            description
          );

          return NextResponse.json({
            success: true,
            pointsRedeemed: points,
            discountUsd: result.discountUsd,
            discountKhr: Math.round(result.discountUsd * 4000), // KHR conversion
            remainingPoints: result.remainingPoints,
          });
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : "Redemption failed" },
            { status: 400 }
          );
        }
      }

      case "calculate": {
        // Calculate how much discount for given points
        const { points: calcPoints } = body;

        if (!calcPoints || calcPoints <= 0) {
          return NextResponse.json(
            { error: "points is required" },
            { status: 400 }
          );
        }

        const discountUsd = calculateRedemptionValue(calcPoints);
        return NextResponse.json({
          points: calcPoints,
          discountUsd,
          discountKhr: Math.round(discountUsd * 4000),
          meetsMinimum: calcPoints >= MIN_REDEEM_POINTS,
        });
      }

      case "pointsNeeded": {
        // Calculate how many points needed for a discount amount
        const { discountUsd } = body;

        if (!discountUsd || discountUsd <= 0) {
          return NextResponse.json(
            { error: "discountUsd is required" },
            { status: 400 }
          );
        }

        const pointsNeeded = calculatePointsNeeded(discountUsd);
        return NextResponse.json({
          discountUsd,
          pointsNeeded,
          meetsMinimum: pointsNeeded >= MIN_REDEEM_POINTS,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: earn, redeem, calculate, pointsNeeded" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing loyalty action:", error);
    return NextResponse.json(
      { error: "Failed to process loyalty action" },
      { status: 500 }
    );
  }
}
