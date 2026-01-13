// Influencer Commission Tracking API Endpoints
// GET - List influencers, get stats, generate payout report
// POST - Create influencer, record sale, create payout, validate code

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createInfluencer,
  updateInfluencer,
  getInfluencer,
  getInfluencerByCode,
  validateAffiliateCode,
  recordInfluencerSale,
  approveInfluencerSale,
  rejectInfluencerSale,
  getInfluencerSales,
  getInfluencerStats,
  generatePayoutReport,
  createPayout,
  processPayout,
  getInfluencerPayouts,
  listInfluencers,
  getInfluencerDashboardSummary,
  generateAffiliateLink,
  generatePayoutReportCSV,
  INFLUENCER_CONFIG,
} from "@/lib/influencer";
import { InfluencerTier, InfluencerSaleStatus, PayoutStatus } from "@prisma/client";

// GET /api/influencers - List influencers, get stats, or generate reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const id = searchParams.get("id");
    const code = searchParams.get("code");

    // Validate affiliate code (for checkout attribution)
    if (action === "validate" && code) {
      const validation = await validateAffiliateCode(code);
      return NextResponse.json(validation);
    }

    // Get influencer by code (for public lookup)
    if (action === "lookup" && code) {
      const influencer = await getInfluencerByCode(code);
      if (!influencer || !influencer.isActive) {
        return NextResponse.json(
          { error: "Influencer not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        id: influencer.id,
        name: influencer.name,
        affiliateCode: influencer.affiliateCode,
      });
    }

    // Get dashboard summary (admin)
    if (action === "dashboard") {
      const summary = await getInfluencerDashboardSummary();
      return NextResponse.json(summary);
    }

    // Get specific influencer
    if (id && !action) {
      const influencer = await getInfluencer(id);
      if (!influencer) {
        return NextResponse.json(
          { error: "Influencer not found" },
          { status: 404 }
        );
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://shop.example.com";
      const affiliateLink = generateAffiliateLink(influencer.affiliateCode, baseUrl);

      return NextResponse.json({
        ...influencer,
        commissionRate: Number(influencer.commissionRate),
        fixedCommission: Number(influencer.fixedCommission),
        totalSales: Number(influencer.totalSales),
        totalCommission: Number(influencer.totalCommission),
        pendingPayout: Number(influencer.pendingPayout),
        minPayoutAmount: Number(influencer.minPayoutAmount),
        affiliateLink,
      });
    }

    // Get influencer stats
    if (action === "stats" && id) {
      const stats = await getInfluencerStats(id);
      return NextResponse.json(stats);
    }

    // Get influencer sales
    if (action === "sales" && id) {
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "20", 10);
      const status = searchParams.get("status") as InfluencerSaleStatus | null;
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      const sales = await getInfluencerSales(id, {
        page,
        limit,
        status: status || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      return NextResponse.json(sales);
    }

    // Get influencer payouts
    if (action === "payouts" && id) {
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "20", 10);
      const status = searchParams.get("status") as PayoutStatus | null;

      const payouts = await getInfluencerPayouts(id, {
        page,
        limit,
        status: status || undefined,
      });

      return NextResponse.json(payouts);
    }

    // Generate payout report
    if (action === "payoutReport" && id) {
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const format = searchParams.get("format") || "json";

      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: "startDate and endDate are required" },
          { status: 400 }
        );
      }

      const report = await generatePayoutReport(
        id,
        new Date(startDate),
        new Date(endDate)
      );

      if (format === "csv") {
        const csv = generatePayoutReportCSV(report);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="payout-report-${report.affiliateCode}-${startDate}-${endDate}.csv"`,
          },
        });
      }

      return NextResponse.json(report);
    }

    // List all influencers (admin)
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const tier = searchParams.get("tier") as InfluencerTier | null;
    const isActive = searchParams.get("isActive");
    const sortBy = searchParams.get("sortBy") as "name" | "totalSales" | "totalCommission" | "joinedAt" | null;
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" | null;

    const result = await listInfluencers({
      page,
      limit,
      search,
      tier: tier || undefined,
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    });

    return NextResponse.json({
      ...result,
      config: {
        tiers: Object.keys(INFLUENCER_CONFIG.tierCommissionRates),
        defaultCommissionRates: INFLUENCER_CONFIG.tierCommissionRates,
      },
    });
  } catch (error) {
    console.error("Error in influencer GET:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// POST /api/influencers - Create influencer, record sale, manage payouts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: "action is required" },
        { status: 400 }
      );
    }

    switch (action) {
      // Create new influencer
      case "create": {
        const { name, email, phone, socialPlatforms, commissionRate, commissionType, tier, payoutMethod, payoutDetails, notes } = body;

        if (!name || !email) {
          return NextResponse.json(
            { error: "name and email are required" },
            { status: 400 }
          );
        }

        // Check if email already exists
        const existing = await prisma.influencer.findUnique({
          where: { email },
        });

        if (existing) {
          return NextResponse.json(
            { error: "An influencer with this email already exists" },
            { status: 400 }
          );
        }

        const id = await createInfluencer({
          name,
          email,
          phone,
          socialPlatforms,
          commissionRate,
          commissionType,
          tier,
          payoutMethod,
          payoutDetails,
          notes,
        });

        const influencer = await getInfluencer(id);

        return NextResponse.json({
          success: true,
          id,
          affiliateCode: influencer?.affiliateCode,
          message: "Influencer created successfully",
        });
      }

      // Update influencer
      case "update": {
        const { id, ...updateData } = body;

        if (!id) {
          return NextResponse.json(
            { error: "id is required" },
            { status: 400 }
          );
        }

        await updateInfluencer(id, updateData);

        return NextResponse.json({
          success: true,
          message: "Influencer updated successfully",
        });
      }

      // Record a sale (called during checkout when affiliate code is used)
      case "recordSale": {
        const { influencerId, orderId, orderTotal, affiliateCode, source } = body;

        if (!influencerId || !orderId || !orderTotal || !affiliateCode) {
          return NextResponse.json(
            { error: "influencerId, orderId, orderTotal, and affiliateCode are required" },
            { status: 400 }
          );
        }

        const saleId = await recordInfluencerSale({
          influencerId,
          orderId,
          orderTotal,
          affiliateCode,
          source,
        });

        return NextResponse.json({
          success: true,
          saleId,
          message: "Sale recorded successfully",
        });
      }

      // Approve a sale (order completed)
      case "approveSale": {
        const { saleId } = body;

        if (!saleId) {
          return NextResponse.json(
            { error: "saleId is required" },
            { status: 400 }
          );
        }

        await approveInfluencerSale(saleId);

        return NextResponse.json({
          success: true,
          message: "Sale approved successfully",
        });
      }

      // Reject a sale (order cancelled)
      case "rejectSale": {
        const { saleId } = body;

        if (!saleId) {
          return NextResponse.json(
            { error: "saleId is required" },
            { status: 400 }
          );
        }

        await rejectInfluencerSale(saleId);

        return NextResponse.json({
          success: true,
          message: "Sale rejected successfully",
        });
      }

      // Create payout
      case "createPayout": {
        const { influencerId, periodStart, periodEnd } = body;

        if (!influencerId || !periodStart || !periodEnd) {
          return NextResponse.json(
            { error: "influencerId, periodStart, and periodEnd are required" },
            { status: 400 }
          );
        }

        const payoutId = await createPayout({
          influencerId,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
        });

        return NextResponse.json({
          success: true,
          payoutId,
          message: "Payout created successfully",
        });
      }

      // Process payout (mark as completed)
      case "processPayout": {
        const { payoutId, payoutReference, paidBy, notes } = body;

        if (!payoutId) {
          return NextResponse.json(
            { error: "payoutId is required" },
            { status: 400 }
          );
        }

        await processPayout(payoutId, {
          payoutReference,
          paidBy,
          notes,
        });

        return NextResponse.json({
          success: true,
          message: "Payout processed successfully",
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in influencer POST:", error);
    const message = error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/influencers - Deactivate influencer
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    // Soft delete - just deactivate
    await prisma.influencer.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Influencer deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting influencer:", error);
    return NextResponse.json(
      { error: "Failed to delete influencer" },
      { status: 500 }
    );
  }
}
