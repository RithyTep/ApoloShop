import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAllTaxRates,
  upsertTaxRate,
  deleteTaxRate,
} from "@/lib/tax-service";
import { TaxType, TaxPricingMode } from "@prisma/client";

// GET /api/tax-rates - Get all tax rates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");
    const activeOnly = searchParams.get("activeOnly") === "true";

    let taxRates;

    if (country || activeOnly) {
      // Filter query
      taxRates = await prisma.taxRate.findMany({
        where: {
          ...(country && { country: country.toUpperCase() }),
          ...(activeOnly && { isActive: true }),
        },
        orderBy: [
          { country: "asc" },
          { region: "asc" },
          { categoryId: "asc" },
        ],
      });
    } else {
      // Get all
      taxRates = await getAllTaxRates();
    }

    // Transform for frontend
    const response = taxRates.map((rate) => ({
      id: rate.id,
      country: rate.country,
      countryName: rate.countryName,
      region: rate.region,
      regionName: rate.regionName,
      name: rate.name,
      rate: Number(rate.rate),
      ratePercent: Number(rate.rate) * 100,
      taxType: rate.taxType,
      categoryId: rate.categoryId,
      pricingMode: rate.pricingMode,
      isDefault: rate.isDefault,
      isActive: rate.isActive,
      description: rate.description,
      effectiveFrom: rate.effectiveFrom?.toISOString() || null,
      effectiveTo: rate.effectiveTo?.toISOString() || null,
      createdAt: rate.createdAt.toISOString(),
      updatedAt: rate.updatedAt.toISOString(),
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching tax rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch tax rates" },
      { status: 500 }
    );
  }
}

// POST /api/tax-rates - Create a new tax rate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.country || !body.countryName || !body.name || body.rate === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: country, countryName, name, rate" },
        { status: 400 }
      );
    }

    // Validate rate is a number between 0 and 1
    const rate = parseFloat(body.rate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      return NextResponse.json(
        { error: "Rate must be a number between 0 and 1 (e.g., 0.1 for 10%)" },
        { status: 400 }
      );
    }

    // Validate taxType if provided
    const validTaxTypes: TaxType[] = ["VAT", "SALES_TAX", "GST", "CUSTOM"];
    if (body.taxType && !validTaxTypes.includes(body.taxType)) {
      return NextResponse.json(
        { error: `Invalid taxType. Must be one of: ${validTaxTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate pricingMode if provided
    const validPricingModes: TaxPricingMode[] = ["EXCLUSIVE", "INCLUSIVE"];
    if (body.pricingMode && !validPricingModes.includes(body.pricingMode)) {
      return NextResponse.json(
        { error: `Invalid pricingMode. Must be one of: ${validPricingModes.join(", ")}` },
        { status: 400 }
      );
    }

    const taxRate = await upsertTaxRate({
      country: body.country.toUpperCase(),
      countryName: body.countryName,
      region: body.region || null,
      regionName: body.regionName || null,
      name: body.name,
      rate,
      taxType: body.taxType || "VAT",
      categoryId: body.categoryId || null,
      pricingMode: body.pricingMode || "EXCLUSIVE",
      isDefault: body.isDefault || false,
      isActive: body.isActive !== false, // Default to true
      description: body.description || null,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
    });

    return NextResponse.json({
      id: taxRate.id,
      country: taxRate.country,
      countryName: taxRate.countryName,
      region: taxRate.region,
      regionName: taxRate.regionName,
      name: taxRate.name,
      rate: Number(taxRate.rate),
      ratePercent: Number(taxRate.rate) * 100,
      taxType: taxRate.taxType,
      categoryId: taxRate.categoryId,
      pricingMode: taxRate.pricingMode,
      isDefault: taxRate.isDefault,
      isActive: taxRate.isActive,
      description: taxRate.description,
      effectiveFrom: taxRate.effectiveFrom?.toISOString() || null,
      effectiveTo: taxRate.effectiveTo?.toISOString() || null,
      createdAt: taxRate.createdAt.toISOString(),
      updatedAt: taxRate.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating tax rate:", error);

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A tax rate with this country, region, and category combination already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create tax rate" },
      { status: 500 }
    );
  }
}

// PUT /api/tax-rates - Update a tax rate
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Tax rate ID is required for update" },
        { status: 400 }
      );
    }

    // Validate rate if provided
    if (body.rate !== undefined) {
      const rate = parseFloat(body.rate);
      if (isNaN(rate) || rate < 0 || rate > 1) {
        return NextResponse.json(
          { error: "Rate must be a number between 0 and 1" },
          { status: 400 }
        );
      }
      body.rate = rate;
    }

    // Parse dates if provided
    if (body.effectiveFrom) {
      body.effectiveFrom = new Date(body.effectiveFrom);
    }
    if (body.effectiveTo) {
      body.effectiveTo = new Date(body.effectiveTo);
    }

    const taxRate = await upsertTaxRate({
      id: body.id,
      country: body.country?.toUpperCase(),
      countryName: body.countryName,
      region: body.region,
      regionName: body.regionName,
      name: body.name,
      rate: body.rate,
      taxType: body.taxType,
      categoryId: body.categoryId,
      pricingMode: body.pricingMode,
      isDefault: body.isDefault,
      isActive: body.isActive,
      description: body.description,
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo,
    });

    return NextResponse.json({
      id: taxRate.id,
      country: taxRate.country,
      countryName: taxRate.countryName,
      region: taxRate.region,
      regionName: taxRate.regionName,
      name: taxRate.name,
      rate: Number(taxRate.rate),
      ratePercent: Number(taxRate.rate) * 100,
      taxType: taxRate.taxType,
      categoryId: taxRate.categoryId,
      pricingMode: taxRate.pricingMode,
      isDefault: taxRate.isDefault,
      isActive: taxRate.isActive,
      description: taxRate.description,
      effectiveFrom: taxRate.effectiveFrom?.toISOString() || null,
      effectiveTo: taxRate.effectiveTo?.toISOString() || null,
      createdAt: taxRate.createdAt.toISOString(),
      updatedAt: taxRate.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating tax rate:", error);
    return NextResponse.json(
      { error: "Failed to update tax rate" },
      { status: 500 }
    );
  }
}

// DELETE /api/tax-rates - Delete a tax rate
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Tax rate ID is required" },
        { status: 400 }
      );
    }

    await deleteTaxRate(id);

    return NextResponse.json({ success: true, message: "Tax rate deleted" });
  } catch (error) {
    console.error("Error deleting tax rate:", error);
    return NextResponse.json(
      { error: "Failed to delete tax rate" },
      { status: 500 }
    );
  }
}
