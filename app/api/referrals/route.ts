// Referral Program API Endpoints
// GET - Get referral code and stats for a customer
// POST - Validate/apply referral code, complete referral

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getOrCreateReferralCode,
  getReferralCodeInfo,
  validateReferralCode,
  createPendingReferral,
  completeReferral,
  findPendingReferralForCustomer,
  getReferralStats,
  getReferralHistory,
  generateReferralLink,
  generateShareMessages,
  REFERRAL_CONFIG,
} from "@/lib/referral";

// GET /api/referrals - Get referral code and stats for a customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const phone = searchParams.get("phone");
    const action = searchParams.get("action");
    const code = searchParams.get("code");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Validate referral code (for new customers checking a code)
    if (action === "validate" && code) {
      const refereePhone = searchParams.get("refereePhone");

      if (!refereePhone) {
        return NextResponse.json(
          { error: "refereePhone is required for validation" },
          { status: 400 }
        );
      }

      const validation = await validateReferralCode(code, refereePhone);
      return NextResponse.json(validation);
    }

    // Lookup pending referral for a customer (during checkout)
    if (action === "pending" && customerId) {
      const pending = await findPendingReferralForCustomer(customerId);
      return NextResponse.json({ pending });
    }

    // Must provide either customerId or phone for other actions
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

    // Get or create referral code
    const referralCode = await getOrCreateReferralCode(resolvedCustomerId);
    const codeInfo = await getReferralCodeInfo(resolvedCustomerId);
    const stats = await getReferralStats(resolvedCustomerId);

    // Get history if requested
    const includeHistory = searchParams.get("includeHistory") === "true";
    let history = null;

    if (includeHistory) {
      history = await getReferralHistory(resolvedCustomerId, page, limit);
    }

    // Generate shareable link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://shop.example.com";
    const referralLink = generateReferralLink(referralCode, baseUrl);
    const language = (searchParams.get("lang") || "en") as "en" | "kh";
    const shareMessages = generateShareMessages(referralCode, referralLink, language);

    return NextResponse.json({
      code: referralCode,
      isActive: codeInfo?.isActive ?? true,
      stats,
      config: {
        referrerReward: REFERRAL_CONFIG.referrerReward,
        refereeReward: REFERRAL_CONFIG.refereeReward,
        rewardType: REFERRAL_CONFIG.rewardType,
        expirationDays: REFERRAL_CONFIG.expirationDays,
        maxReferralsPerMonth: REFERRAL_CONFIG.maxReferralsPerMonth,
      },
      shareLinks: {
        referralLink,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareMessages.telegram)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(shareMessages.facebook)}`,
        copyText: shareMessages.copy,
      },
      history: history?.referrals,
      pagination: history?.pagination,
    });
  } catch (error) {
    console.error("Error fetching referral info:", error);
    return NextResponse.json(
      { error: "Failed to fetch referral info" },
      { status: 500 }
    );
  }
}

// POST /api/referrals - Apply or complete a referral
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: "action is required (apply, complete)" },
        { status: 400 }
      );
    }

    switch (action) {
      // Apply a referral code (when new customer uses a code)
      case "apply": {
        const { code, refereePhone, refereeId } = body;

        if (!code) {
          return NextResponse.json(
            { error: "code is required" },
            { status: 400 }
          );
        }

        if (!refereePhone) {
          return NextResponse.json(
            { error: "refereePhone is required" },
            { status: 400 }
          );
        }

        // Validate the code
        const validation = await validateReferralCode(code, refereePhone);

        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        // Create pending referral
        const referralId = await createPendingReferral(
          validation.referrerId!,
          refereeId || null,
          code
        );

        return NextResponse.json({
          success: true,
          referralId,
          discount: validation.refereeDiscount,
          message: `Referral code applied! You will receive $${validation.refereeDiscount} off your first order.`,
        });
      }

      // Complete a referral (after first purchase)
      case "complete": {
        const { referralId, orderId, customerId } = body;

        // If referralId not provided, try to find by customerId
        let targetReferralId = referralId;

        if (!targetReferralId && customerId) {
          const pending = await findPendingReferralForCustomer(customerId);
          if (pending) {
            targetReferralId = pending.referralId;
          }
        }

        if (!targetReferralId) {
          return NextResponse.json(
            { error: "referralId or customerId with pending referral is required" },
            { status: 400 }
          );
        }

        if (!orderId) {
          return NextResponse.json(
            { error: "orderId is required" },
            { status: 400 }
          );
        }

        const result = await completeReferral(targetReferralId, orderId);

        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          referrerReward: result.referrerReward,
          message: "Referral completed successfully! Referrer has been rewarded.",
        });
      }

      // Update referee ID on a pending referral
      case "updateReferee": {
        const { referralId, refereeId } = body;

        if (!referralId || !refereeId) {
          return NextResponse.json(
            { error: "referralId and refereeId are required" },
            { status: 400 }
          );
        }

        await prisma.referral.update({
          where: { id: referralId },
          data: { refereeId },
        });

        return NextResponse.json({
          success: true,
          message: "Referee updated successfully",
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: apply, complete, updateReferee" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing referral action:", error);
    return NextResponse.json(
      { error: "Failed to process referral action" },
      { status: 500 }
    );
  }
}
