// Subscription plan types and utilities for ApoloShop SaaS billing

import type { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

// ============================================
// PLAN LIMITS CONFIGURATION
// ============================================

export interface PlanLimits {
  maxProducts: number;
  maxOrdersPerMonth: number;
  maxCustomers: number;
  features: {
    customDomain: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    multipleUsers: boolean;
    exportReports: boolean;
    bulkImport: boolean;
  };
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    maxProducts: 20,
    maxOrdersPerMonth: 50,
    maxCustomers: 100,
    features: {
      customDomain: false,
      advancedAnalytics: false,
      prioritySupport: false,
      customBranding: false,
      apiAccess: false,
      multipleUsers: false,
      exportReports: false,
      bulkImport: false,
    },
  },
  STARTER: {
    maxProducts: 100,
    maxOrdersPerMonth: 500,
    maxCustomers: 1000,
    features: {
      customDomain: true,
      advancedAnalytics: true,
      prioritySupport: false,
      customBranding: true,
      apiAccess: false,
      multipleUsers: false,
      exportReports: true,
      bulkImport: true,
    },
  },
  PRO: {
    maxProducts: -1, // Unlimited
    maxOrdersPerMonth: -1, // Unlimited
    maxCustomers: -1, // Unlimited
    features: {
      customDomain: true,
      advancedAnalytics: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
      multipleUsers: true,
      exportReports: true,
      bulkImport: true,
    },
  },
};

// ============================================
// PLAN PRICING (USD)
// ============================================

export interface PlanPricing {
  monthly: number;
  yearly: number; // With discount
  yearlyDiscount: number; // Percentage saved
}

export const PLAN_PRICING: Record<SubscriptionPlan, PlanPricing> = {
  FREE: {
    monthly: 0,
    yearly: 0,
    yearlyDiscount: 0,
  },
  STARTER: {
    monthly: 19,
    yearly: 190, // Save ~17%
    yearlyDiscount: 17,
  },
  PRO: {
    monthly: 49,
    yearly: 470, // Save ~20%
    yearlyDiscount: 20,
  },
};

// ============================================
// PLAN DISPLAY INFO
// ============================================

export interface PlanInfo {
  name: string;
  description: string;
  badge?: string;
}

export const PLAN_INFO: Record<SubscriptionPlan, PlanInfo> = {
  FREE: {
    name: 'Free',
    description: 'Perfect for getting started',
  },
  STARTER: {
    name: 'Starter',
    description: 'For growing businesses',
    badge: 'Popular',
  },
  PRO: {
    name: 'Pro',
    description: 'For established shops',
  },
};

// ============================================
// USAGE & LIMIT CHECKING
// ============================================

export interface UsageStatus {
  products: {
    used: number;
    limit: number;
    percentage: number;
    isUnlimited: boolean;
    isApproachingLimit: boolean;
    isAtLimit: boolean;
  };
  ordersThisMonth: {
    used: number;
    limit: number;
    percentage: number;
    isUnlimited: boolean;
    isApproachingLimit: boolean;
    isAtLimit: boolean;
  };
  customers: {
    used: number;
    limit: number;
    percentage: number;
    isUnlimited: boolean;
    isApproachingLimit: boolean;
    isAtLimit: boolean;
  };
}

// Threshold for "approaching limit" warnings (80%)
const APPROACHING_LIMIT_THRESHOLD = 0.8;

export function calculateUsageStatus(
  plan: SubscriptionPlan,
  productsUsed: number,
  ordersThisMonth: number,
  customersCount: number
): UsageStatus {
  const limits = PLAN_LIMITS[plan];

  const calculateMetric = (used: number, limit: number) => {
    const isUnlimited = limit === -1;
    const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
    const isApproachingLimit = !isUnlimited && percentage >= APPROACHING_LIMIT_THRESHOLD * 100;
    const isAtLimit = !isUnlimited && used >= limit;

    return {
      used,
      limit,
      percentage: Math.round(percentage),
      isUnlimited,
      isApproachingLimit,
      isAtLimit,
    };
  };

  return {
    products: calculateMetric(productsUsed, limits.maxProducts),
    ordersThisMonth: calculateMetric(ordersThisMonth, limits.maxOrdersPerMonth),
    customers: calculateMetric(customersCount, limits.maxCustomers),
  };
}

export function canAddProduct(plan: SubscriptionPlan, currentProductCount: number): boolean {
  const limit = PLAN_LIMITS[plan].maxProducts;
  return limit === -1 || currentProductCount < limit;
}

export function canCreateOrder(plan: SubscriptionPlan, ordersThisMonth: number): boolean {
  const limit = PLAN_LIMITS[plan].maxOrdersPerMonth;
  return limit === -1 || ordersThisMonth < limit;
}

export function canAddCustomer(plan: SubscriptionPlan, currentCustomerCount: number): boolean {
  const limit = PLAN_LIMITS[plan].maxCustomers;
  return limit === -1 || currentCustomerCount < limit;
}

export function hasFeature(plan: SubscriptionPlan, feature: keyof PlanLimits['features']): boolean {
  return PLAN_LIMITS[plan].features[feature];
}

// ============================================
// SUBSCRIPTION STATUS HELPERS
// ============================================

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'ACTIVE';
}

export function isSubscriptionValid(status: SubscriptionStatus, expiresAt: Date): boolean {
  if (status === 'CANCELLED' || status === 'EXPIRED') {
    return false;
  }
  return new Date() < expiresAt;
}

export function getEffectivePlan(
  plan: SubscriptionPlan,
  status: SubscriptionStatus,
  expiresAt: Date
): SubscriptionPlan {
  // If subscription is not valid, fall back to FREE
  if (!isSubscriptionValid(status, expiresAt)) {
    return 'FREE';
  }
  return plan;
}

// ============================================
// UPGRADE RECOMMENDATIONS
// ============================================

export interface UpgradeRecommendation {
  shouldUpgrade: boolean;
  reason?: string;
  suggestedPlan?: SubscriptionPlan;
  blockedAction?: string;
}

export function getUpgradeRecommendation(
  currentPlan: SubscriptionPlan,
  usage: UsageStatus
): UpgradeRecommendation {
  // Already on PRO, no upgrade needed
  if (currentPlan === 'PRO') {
    return { shouldUpgrade: false };
  }

  // Check if any limit is reached
  if (usage.products.isAtLimit) {
    return {
      shouldUpgrade: true,
      reason: 'You have reached your product limit',
      suggestedPlan: currentPlan === 'FREE' ? 'STARTER' : 'PRO',
      blockedAction: 'add products',
    };
  }

  if (usage.ordersThisMonth.isAtLimit) {
    return {
      shouldUpgrade: true,
      reason: 'You have reached your monthly order limit',
      suggestedPlan: currentPlan === 'FREE' ? 'STARTER' : 'PRO',
      blockedAction: 'process orders',
    };
  }

  if (usage.customers.isAtLimit) {
    return {
      shouldUpgrade: true,
      reason: 'You have reached your customer limit',
      suggestedPlan: currentPlan === 'FREE' ? 'STARTER' : 'PRO',
      blockedAction: 'add customers',
    };
  }

  // Check if approaching limits
  const isApproachingAnyLimit =
    usage.products.isApproachingLimit ||
    usage.ordersThisMonth.isApproachingLimit ||
    usage.customers.isApproachingLimit;

  if (isApproachingAnyLimit) {
    return {
      shouldUpgrade: true,
      reason: 'You are approaching your plan limits',
      suggestedPlan: currentPlan === 'FREE' ? 'STARTER' : 'PRO',
    };
  }

  return { shouldUpgrade: false };
}

// ============================================
// DEFAULT SUBSCRIPTION FACTORY
// ============================================

export function createDefaultSubscription(clientId: string) {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month free trial

  return {
    clientId,
    plan: 'FREE' as SubscriptionPlan,
    status: 'ACTIVE' as SubscriptionStatus,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    productsUsed: 0,
    ordersThisMonth: 0,
  };
}
