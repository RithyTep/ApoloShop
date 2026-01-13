import { NextRequest, NextResponse } from "next/server";
import { getTaxReport, exportTaxLogs, USD_TO_KHR_RATE } from "@/lib/tax-service";

// GET /api/reports/tax - Get tax report for date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format"); // 'json' (default) or 'csv'

    // Default to last 30 days if no dates provided
    const now = new Date();
    const defaultStartDate = new Date(now);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const dateFrom = startDate ? new Date(startDate) : defaultStartDate;
    const dateTo = endDate ? new Date(endDate) : now;

    // Ensure dateTo is end of day
    dateTo.setHours(23, 59, 59, 999);

    // Handle CSV export
    if (format === "csv") {
      const logs = await exportTaxLogs(dateFrom, dateTo);

      if (logs.length === 0) {
        return NextResponse.json(
          { error: "No tax data found for the specified date range" },
          { status: 404 }
        );
      }

      // Build CSV content
      const headers = [
        "Order ID",
        "Date",
        "Country",
        "Region",
        "Tax Name",
        "Tax Type",
        "Tax Rate",
        "Pricing Mode",
        "Subtotal (USD)",
        "Subtotal (KHR)",
        "Tax Amount (USD)",
        "Tax Amount (KHR)",
      ];

      const rows = logs.map((log) => [
        log.orderId,
        log.date,
        log.country,
        log.region,
        log.taxName,
        log.taxType,
        log.taxRate,
        log.pricingMode,
        log.subtotalUsd,
        log.subtotalKhr,
        log.taxAmountUsd,
        log.taxAmountKhr,
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="tax-report-${dateFrom.toISOString().split("T")[0]}-to-${dateTo.toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Get JSON report
    const report = await getTaxReport(dateFrom, dateTo);

    // Transform dates to ISO strings for JSON response
    const response = {
      ...report,
      startDate: report.startDate.toISOString(),
      endDate: report.endDate.toISOString(),
      logs: report.logs.map((log) => ({
        id: log.id,
        orderId: log.orderId,
        taxRateId: log.taxRateId,
        taxName: log.taxName,
        taxRateValue: Number(log.taxRateValue),
        taxRatePercent: Number(log.taxRateValue) * 100,
        taxType: log.taxType,
        pricingMode: log.pricingMode,
        country: log.country,
        region: log.region,
        subtotalUsd: Number(log.subtotalUsd),
        subtotalKhr: log.subtotalKhr,
        taxAmountUsd: Number(log.taxAmountUsd),
        taxAmountKhr: log.taxAmountKhr,
        createdAt: log.createdAt.toISOString(),
      })),
      // Add summary metrics
      summary: {
        totalOrders: report.totalOrders,
        totalSubtotalUsd: report.totalSubtotalUsd,
        totalSubtotalKhr: report.totalSubtotalKhr,
        totalTaxUsd: report.totalTaxUsd,
        totalTaxKhr: report.totalTaxKhr,
        effectiveTaxRate:
          report.totalSubtotalUsd > 0
            ? Math.round(
                (report.totalTaxUsd / report.totalSubtotalUsd) * 10000
              ) / 100
            : 0,
      },
      // Exchange rate reference
      exchangeRate: USD_TO_KHR_RATE,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating tax report:", error);
    return NextResponse.json(
      { error: "Failed to generate tax report" },
      { status: 500 }
    );
  }
}
