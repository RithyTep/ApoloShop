// Tax Calculation Service
// Location-based tax calculation for ApoloShop

import prisma from "./prisma";
import { TaxType, TaxPricingMode } from "@prisma/client";

// ============================================
// CONFIGURATION
// ============================================

// Default Cambodia VAT rate (10%)
export const CAMBODIA_VAT_RATE = 0.1;

// Currency exchange rate (1 USD = 4000 KHR)
export const USD_TO_KHR_RATE = 4000;

// Common tax rates by country (as fallback if no DB rate exists)
export const DEFAULT_TAX_RATES: Record<
  string,
  { rate: number; name: string; type: TaxType }
> = {
  KH: { rate: 0.1, name: "Cambodia VAT", type: "VAT" },
  US: { rate: 0.0, name: "US Sales Tax", type: "SALES_TAX" }, // Varies by state
  TH: { rate: 0.07, name: "Thailand VAT", type: "VAT" },
  VN: { rate: 0.1, name: "Vietnam VAT", type: "VAT" },
  SG: { rate: 0.09, name: "Singapore GST", type: "GST" },
  MY: { rate: 0.06, name: "Malaysia SST", type: "SALES_TAX" },
};

// ============================================
// TYPES
// ============================================

export interface TaxCalculationInput {
  subtotalUsd: number;
  country: string;
  region?: string | null;
  categoryId?: string | null;
}

export interface TaxCalculationResult {
  subtotalUsd: number;
  subtotalKhr: number;
  taxAmountUsd: number;
  taxAmountKhr: number;
  totalUsd: number;
  totalKhr: number;
  taxRate: number;
  taxName: string;
  taxType: TaxType;
  pricingMode: TaxPricingMode;
  taxRateId?: string;
  country: string;
  region?: string | null;
}

export interface TaxBreakdown {
  items: TaxBreakdownItem[];
  totalTaxUsd: number;
  totalTaxKhr: number;
}

export interface TaxBreakdownItem {
  categoryId: string | null;
  categoryName?: string;
  subtotalUsd: number;
  taxRate: number;
  taxName: string;
  taxAmountUsd: number;
  taxAmountKhr: number;
}

// ============================================
// TAX RATE LOOKUP
// ============================================

/**
 * Get applicable tax rate for a location and optional category
 * Priority: 1) Category-specific rate, 2) Country+Region rate, 3) Country default, 4) System default
 */
export async function getTaxRate(
  country: string,
  region?: string | null,
  categoryId?: string | null
): Promise<{
  id?: string;
  rate: number;
  name: string;
  type: TaxType;
  pricingMode: TaxPricingMode;
}> {
  // Try to find the most specific matching rate
  const conditions = [];

  // 1. Category-specific rate for this location
  if (categoryId) {
    conditions.push(
      prisma.taxRate.findFirst({
        where: {
          country,
          region: region || null,
          categoryId,
          isActive: true,
          OR: [
            { effectiveFrom: null },
            { effectiveFrom: { lte: new Date() } },
          ],
          AND: [
            {
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
            },
          ],
        },
        orderBy: { isDefault: "desc" },
      })
    );
  }

  // 2. Region-specific rate (no category)
  if (region) {
    conditions.push(
      prisma.taxRate.findFirst({
        where: {
          country,
          region,
          categoryId: null,
          isActive: true,
          OR: [
            { effectiveFrom: null },
            { effectiveFrom: { lte: new Date() } },
          ],
          AND: [
            {
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
            },
          ],
        },
        orderBy: { isDefault: "desc" },
      })
    );
  }

  // 3. Country default rate (no region, no category)
  conditions.push(
    prisma.taxRate.findFirst({
      where: {
        country,
        region: null,
        categoryId: null,
        isActive: true,
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: new Date() } }],
        AND: [
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }] },
        ],
      },
      orderBy: { isDefault: "desc" },
    })
  );

  // Execute all queries in parallel
  const results = await Promise.all(conditions);

  // Find first non-null result
  for (const rate of results) {
    if (rate) {
      return {
        id: rate.id,
        rate: Number(rate.rate),
        name: rate.name,
        type: rate.taxType,
        pricingMode: rate.pricingMode,
      };
    }
  }

  // Fallback to default rates
  const countryUpper = country.toUpperCase();
  if (DEFAULT_TAX_RATES[countryUpper]) {
    return {
      ...DEFAULT_TAX_RATES[countryUpper],
      pricingMode: "EXCLUSIVE" as TaxPricingMode,
    };
  }

  // No tax if no rate found
  return {
    rate: 0,
    name: "No Tax",
    type: "CUSTOM" as TaxType,
    pricingMode: "EXCLUSIVE" as TaxPricingMode,
  };
}

// ============================================
// TAX CALCULATION
// ============================================

/**
 * Calculate tax for a given subtotal and location
 */
export async function calculateTax(
  input: TaxCalculationInput
): Promise<TaxCalculationResult> {
  const { subtotalUsd, country, region, categoryId } = input;

  // Get applicable tax rate
  const taxRateInfo = await getTaxRate(country, region, categoryId);

  // Calculate amounts based on pricing mode
  let taxAmountUsd: number;
  let effectiveSubtotalUsd: number;

  if (taxRateInfo.pricingMode === "INCLUSIVE") {
    // Price includes tax - extract tax from subtotal
    effectiveSubtotalUsd = subtotalUsd / (1 + taxRateInfo.rate);
    taxAmountUsd = subtotalUsd - effectiveSubtotalUsd;
  } else {
    // Price excludes tax - add tax to subtotal
    effectiveSubtotalUsd = subtotalUsd;
    taxAmountUsd = subtotalUsd * taxRateInfo.rate;
  }

  // Round to 2 decimal places
  taxAmountUsd = Math.round(taxAmountUsd * 100) / 100;
  effectiveSubtotalUsd = Math.round(effectiveSubtotalUsd * 100) / 100;

  // Calculate KHR amounts
  const subtotalKhr = Math.round(effectiveSubtotalUsd * USD_TO_KHR_RATE);
  const taxAmountKhr = Math.round(taxAmountUsd * USD_TO_KHR_RATE);

  // Calculate totals
  const totalUsd =
    taxRateInfo.pricingMode === "INCLUSIVE"
      ? subtotalUsd
      : effectiveSubtotalUsd + taxAmountUsd;
  const totalKhr = Math.round(totalUsd * USD_TO_KHR_RATE);

  return {
    subtotalUsd: effectiveSubtotalUsd,
    subtotalKhr,
    taxAmountUsd,
    taxAmountKhr,
    totalUsd,
    totalKhr,
    taxRate: taxRateInfo.rate,
    taxName: taxRateInfo.name,
    taxType: taxRateInfo.type,
    pricingMode: taxRateInfo.pricingMode,
    taxRateId: taxRateInfo.id,
    country,
    region,
  };
}

/**
 * Calculate tax for multiple items with different categories
 * Returns breakdown by category for reporting
 */
export async function calculateTaxBreakdown(
  items: Array<{
    categoryId: string | null;
    categoryName?: string;
    subtotalUsd: number;
  }>,
  country: string,
  region?: string | null
): Promise<TaxBreakdown> {
  const breakdownItems: TaxBreakdownItem[] = [];
  let totalTaxUsd = 0;
  let totalTaxKhr = 0;

  // Group items by category for efficiency
  const categoryGroups = new Map<
    string,
    { subtotal: number; categoryName?: string }
  >();

  for (const item of items) {
    const key = item.categoryId || "__no_category__";
    const existing = categoryGroups.get(key);
    if (existing) {
      existing.subtotal += item.subtotalUsd;
    } else {
      categoryGroups.set(key, {
        subtotal: item.subtotalUsd,
        categoryName: item.categoryName,
      });
    }
  }

  // Calculate tax for each category
  for (const [categoryKey, data] of categoryGroups) {
    const categoryId = categoryKey === "__no_category__" ? null : categoryKey;
    const taxRateInfo = await getTaxRate(country, region, categoryId);

    let taxAmountUsd: number;
    let effectiveSubtotal: number;

    if (taxRateInfo.pricingMode === "INCLUSIVE") {
      effectiveSubtotal = data.subtotal / (1 + taxRateInfo.rate);
      taxAmountUsd = data.subtotal - effectiveSubtotal;
    } else {
      effectiveSubtotal = data.subtotal;
      taxAmountUsd = data.subtotal * taxRateInfo.rate;
    }

    taxAmountUsd = Math.round(taxAmountUsd * 100) / 100;
    const taxAmountKhr = Math.round(taxAmountUsd * USD_TO_KHR_RATE);

    breakdownItems.push({
      categoryId,
      categoryName: data.categoryName,
      subtotalUsd: effectiveSubtotal,
      taxRate: taxRateInfo.rate,
      taxName: taxRateInfo.name,
      taxAmountUsd,
      taxAmountKhr,
    });

    totalTaxUsd += taxAmountUsd;
    totalTaxKhr += taxAmountKhr;
  }

  return {
    items: breakdownItems,
    totalTaxUsd: Math.round(totalTaxUsd * 100) / 100,
    totalTaxKhr,
  };
}

// ============================================
// TAX LOGGING
// ============================================

/**
 * Log tax applied to an order (for reporting and audit)
 */
export async function logOrderTax(
  orderId: string,
  taxResult: TaxCalculationResult
): Promise<void> {
  await prisma.taxLog.create({
    data: {
      orderId,
      taxRateId: taxResult.taxRateId || null,
      taxName: taxResult.taxName,
      taxRateValue: taxResult.taxRate,
      taxType: taxResult.taxType,
      pricingMode: taxResult.pricingMode,
      country: taxResult.country,
      region: taxResult.region,
      subtotalUsd: taxResult.subtotalUsd,
      subtotalKhr: taxResult.subtotalKhr,
      taxAmountUsd: taxResult.taxAmountUsd,
      taxAmountKhr: taxResult.taxAmountKhr,
    },
  });
}

// ============================================
// TAX RATE MANAGEMENT
// ============================================

/**
 * Create or update a tax rate
 */
export async function upsertTaxRate(data: {
  id?: string;
  country: string;
  countryName: string;
  region?: string | null;
  regionName?: string | null;
  name: string;
  rate: number;
  taxType?: TaxType;
  categoryId?: string | null;
  pricingMode?: TaxPricingMode;
  isDefault?: boolean;
  isActive?: boolean;
  description?: string | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
}) {
  const {
    id,
    country,
    countryName,
    region = null,
    regionName = null,
    name,
    rate,
    taxType = "VAT",
    categoryId = null,
    pricingMode = "EXCLUSIVE",
    isDefault = false,
    isActive = true,
    description = null,
    effectiveFrom = null,
    effectiveTo = null,
  } = data;

  // If setting as default, unset other defaults for this country
  if (isDefault) {
    await prisma.taxRate.updateMany({
      where: {
        country,
        isDefault: true,
        id: id ? { not: id } : undefined,
      },
      data: { isDefault: false },
    });
  }

  if (id) {
    return prisma.taxRate.update({
      where: { id },
      data: {
        country,
        countryName,
        region,
        regionName,
        name,
        rate,
        taxType,
        categoryId,
        pricingMode,
        isDefault,
        isActive,
        description,
        effectiveFrom,
        effectiveTo,
      },
    });
  }

  return prisma.taxRate.create({
    data: {
      country,
      countryName,
      region,
      regionName,
      name,
      rate,
      taxType,
      categoryId,
      pricingMode,
      isDefault,
      isActive,
      description,
      effectiveFrom,
      effectiveTo,
    },
  });
}

/**
 * Get all tax rates (for admin UI)
 */
export async function getAllTaxRates() {
  return prisma.taxRate.findMany({
    orderBy: [{ country: "asc" }, { region: "asc" }, { categoryId: "asc" }],
  });
}

/**
 * Delete a tax rate
 */
export async function deleteTaxRate(id: string) {
  return prisma.taxRate.delete({
    where: { id },
  });
}

// ============================================
// TAX REPORTING
// ============================================

/**
 * Get tax report summary for date range
 */
export async function getTaxReport(startDate: Date, endDate: Date) {
  const logs = await prisma.taxLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Aggregate by country
  const byCountry = new Map<
    string,
    {
      country: string;
      totalSubtotalUsd: number;
      totalTaxUsd: number;
      orderCount: number;
    }
  >();

  // Aggregate by tax type
  const byTaxType = new Map<
    string,
    {
      taxType: TaxType;
      taxName: string;
      totalSubtotalUsd: number;
      totalTaxUsd: number;
      orderCount: number;
    }
  >();

  for (const log of logs) {
    // By country
    const countryData = byCountry.get(log.country) || {
      country: log.country,
      totalSubtotalUsd: 0,
      totalTaxUsd: 0,
      orderCount: 0,
    };
    countryData.totalSubtotalUsd += Number(log.subtotalUsd);
    countryData.totalTaxUsd += Number(log.taxAmountUsd);
    countryData.orderCount += 1;
    byCountry.set(log.country, countryData);

    // By tax type/name
    const typeKey = `${log.taxType}:${log.taxName}`;
    const typeData = byTaxType.get(typeKey) || {
      taxType: log.taxType,
      taxName: log.taxName,
      totalSubtotalUsd: 0,
      totalTaxUsd: 0,
      orderCount: 0,
    };
    typeData.totalSubtotalUsd += Number(log.subtotalUsd);
    typeData.totalTaxUsd += Number(log.taxAmountUsd);
    typeData.orderCount += 1;
    byTaxType.set(typeKey, typeData);
  }

  // Calculate totals
  let totalSubtotalUsd = 0;
  let totalTaxUsd = 0;
  for (const log of logs) {
    totalSubtotalUsd += Number(log.subtotalUsd);
    totalTaxUsd += Number(log.taxAmountUsd);
  }

  return {
    startDate,
    endDate,
    totalOrders: logs.length,
    totalSubtotalUsd: Math.round(totalSubtotalUsd * 100) / 100,
    totalSubtotalKhr: Math.round(totalSubtotalUsd * USD_TO_KHR_RATE),
    totalTaxUsd: Math.round(totalTaxUsd * 100) / 100,
    totalTaxKhr: Math.round(totalTaxUsd * USD_TO_KHR_RATE),
    byCountry: Array.from(byCountry.values()).map((d) => ({
      ...d,
      totalSubtotalUsd: Math.round(d.totalSubtotalUsd * 100) / 100,
      totalTaxUsd: Math.round(d.totalTaxUsd * 100) / 100,
    })),
    byTaxType: Array.from(byTaxType.values()).map((d) => ({
      ...d,
      totalSubtotalUsd: Math.round(d.totalSubtotalUsd * 100) / 100,
      totalTaxUsd: Math.round(d.totalTaxUsd * 100) / 100,
    })),
    logs: logs.slice(0, 100), // Return last 100 logs for details
  };
}

/**
 * Export tax logs for accounting (CSV-ready format)
 */
export async function exportTaxLogs(startDate: Date, endDate: Date) {
  const logs = await prisma.taxLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return logs.map((log) => ({
    orderId: log.orderId,
    date: log.createdAt.toISOString().split("T")[0],
    country: log.country,
    region: log.region || "",
    taxName: log.taxName,
    taxType: log.taxType,
    taxRate: `${(Number(log.taxRateValue) * 100).toFixed(2)}%`,
    pricingMode: log.pricingMode,
    subtotalUsd: Number(log.subtotalUsd).toFixed(2),
    subtotalKhr: log.subtotalKhr,
    taxAmountUsd: Number(log.taxAmountUsd).toFixed(2),
    taxAmountKhr: log.taxAmountKhr,
  }));
}
