import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  PLAN_LIMITS,
  PLAN_PRICING,
  PLAN_INFO,
  calculateUsageStatus,
  getUpgradeRecommendation,
  createDefaultSubscription,
  type PlanLimits,
  type PlanPricing,
  type PlanInfo,
  type UsageStatus,
  type UpgradeRecommendation,
} from '@/lib/subscription';
import type { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

// Response type for subscription endpoint
export interface SubscriptionResponse {
  subscription: {
    id: string;
    clientId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    productsUsed: number;
    ordersThisMonth: number;
    createdAt: string;
    cancelledAt: string | null;
  } | null;
  planInfo: PlanInfo;
  planLimits: PlanLimits;
  planPricing: PlanPricing;
  usage: UsageStatus;
  upgradeRecommendation: UpgradeRecommendation;
  allPlans: Array<{
    plan: SubscriptionPlan;
    info: PlanInfo;
    limits: PlanLimits;
    pricing: PlanPricing;
  }>;
}

// GET /api/subscription - Get current subscription and usage
export async function GET(request: NextRequest) {
  try {
    // Get client ID from header (set by middleware) or query param
    const clientId = request.headers.get('x-client-id') ||
                     request.nextUrl.searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Find subscription for this client
    let subscription = await prisma.subscription.findUnique({
      where: { clientId },
      include: {
        client: {
          include: {
            _count: {
              select: {
                products: true,
                customers: true,
              },
            },
          },
        },
      },
    });

    // If no subscription exists, create a default FREE subscription
    if (!subscription) {
      const defaultSub = createDefaultSubscription(clientId);
      subscription = await prisma.subscription.create({
        data: defaultSub,
        include: {
          client: {
            include: {
              _count: {
                select: {
                  products: true,
                  customers: true,
                },
              },
            },
          },
        },
      });
    }

    // Get current month's order count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const ordersThisMonth = await prisma.order.count({
      where: {
        clientId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Calculate usage status
    const productsCount = subscription.client?._count?.products ?? 0;
    const customersCount = subscription.client?._count?.customers ?? 0;
    const usage = calculateUsageStatus(
      subscription.plan,
      productsCount,
      ordersThisMonth,
      customersCount
    );

    // Get upgrade recommendation
    const upgradeRecommendation = getUpgradeRecommendation(subscription.plan, usage);

    // Build all plans info for comparison
    const allPlans: SubscriptionResponse['allPlans'] = (['FREE', 'STARTER', 'PRO'] as SubscriptionPlan[]).map(plan => ({
      plan,
      info: PLAN_INFO[plan],
      limits: PLAN_LIMITS[plan],
      pricing: PLAN_PRICING[plan],
    }));

    const response: SubscriptionResponse = {
      subscription: {
        id: subscription.id,
        clientId: subscription.clientId,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        productsUsed: productsCount,
        ordersThisMonth,
        createdAt: subscription.createdAt.toISOString(),
        cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
      },
      planInfo: PLAN_INFO[subscription.plan],
      planLimits: PLAN_LIMITS[subscription.plan],
      planPricing: PLAN_PRICING[subscription.plan],
      usage,
      upgradeRecommendation,
      allPlans,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// POST /api/subscription - Create or update subscription (for upgrades)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, plan, billingCycle } = body as {
      clientId: string;
      plan: SubscriptionPlan;
      billingCycle?: 'monthly' | 'yearly';
    };

    if (!clientId || !plan) {
      return NextResponse.json(
        { error: 'Client ID and plan are required' },
        { status: 400 }
      );
    }

    // Validate plan
    if (!['FREE', 'STARTER', 'PRO'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Calculate period end based on billing cycle
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create or update subscription
    const subscription = await prisma.subscription.upsert({
      where: { clientId },
      create: {
        clientId,
        plan,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        productsUsed: 0,
        ordersThisMonth: 0,
      },
      update: {
        plan,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null, // Clear cancellation if upgrading
      },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      },
      planInfo: PLAN_INFO[subscription.plan],
      planLimits: PLAN_LIMITS[subscription.plan],
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

// DELETE /api/subscription - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const clientId = request.headers.get('x-client-id') ||
                     request.nextUrl.searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { clientId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Cancel at end of current period
    const updatedSubscription = await prisma.subscription.update({
      where: { clientId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled. Access will continue until the end of the current billing period.',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd.toISOString(),
        cancelledAt: updatedSubscription.cancelledAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
