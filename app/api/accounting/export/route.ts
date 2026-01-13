import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import {
  generateQuickBooksIIF,
  generateExcelSalesData,
  generateRevenueSummary,
  generateTaxReport,
  generateInvoiceData,
  generateInvoiceHTML,
  type OrderForExport,
} from "@/lib/accounting-export"

// GET /api/accounting/export - Export accounting data in various formats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "excel" // quickbooks, excel, csv, tax, summary
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const period = searchParams.get("period") || "monthly" // daily, monthly
    const orderId = searchParams.get("orderId") // For single invoice export

    // Build date range
    const now = new Date()
    const defaultStartDate = new Date(now)
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 1) // Default to last month

    const startDate = dateFrom ? new Date(dateFrom) : defaultStartDate
    const endDate = dateTo ? new Date(dateTo) : now
    endDate.setHours(23, 59, 59, 999)

    // Handle single invoice export
    if (orderId && format === "invoice") {
      return handleInvoiceExport(orderId)
    }

    // Fetch orders for the period
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ["COMPLETED", "READY"],
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    })

    const ordersForExport: OrderForExport[] = orders.map((order) => ({
      ...order,
      customer: order.customer,
      items: order.items,
      payments: order.payments,
    }))

    switch (format) {
      case "quickbooks":
        return handleQuickBooksExport(ordersForExport, startDate, endDate)

      case "excel":
        return handleExcelExport(ordersForExport, startDate, endDate)

      case "csv":
        return handleCSVExport(ordersForExport, startDate, endDate)

      case "tax":
        return handleTaxExport(ordersForExport, startDate, endDate)

      case "summary":
        return handleSummaryExport(ordersForExport, period as "daily" | "monthly")

      default:
        return NextResponse.json(
          { error: "Invalid format. Use: quickbooks, excel, csv, tax, summary" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("GET /api/accounting/export error:", error)
    return NextResponse.json(
      { error: "Failed to export accounting data" },
      { status: 500 }
    )
  }
}

// QuickBooks IIF Export
async function handleQuickBooksExport(
  orders: OrderForExport[],
  startDate: Date,
  endDate: Date
) {
  const iifContent = generateQuickBooksIIF(orders)
  const filename = `quickbooks-export-${startDate.toISOString().split("T")[0]}-to-${endDate.toISOString().split("T")[0]}.iif`

  return new NextResponse(iifContent, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

// Excel Export
async function handleExcelExport(
  orders: OrderForExport[],
  startDate: Date,
  endDate: Date
) {
  const salesData = generateExcelSalesData(orders)

  // Create workbook with multiple sheets
  const wb = XLSX.utils.book_new()

  // Sales sheet
  const salesSheet = XLSX.utils.json_to_sheet(salesData)

  // Set column widths
  salesSheet["!cols"] = [
    { wch: 15 }, // orderNumber
    { wch: 12 }, // orderDate
    { wch: 20 }, // customerName
    { wch: 15 }, // customerPhone
    { wch: 25 }, // customerEmail
    { wch: 40 }, // items
    { wch: 10 }, // itemCount
    { wch: 12 }, // subtotalUsd
    { wch: 12 }, // discountUsd
    { wch: 12 }, // totalUsd
    { wch: 15 }, // totalKhr
    { wch: 8 },  // currency
    { wch: 15 }, // paymentMethod
    { wch: 12 }, // paymentStatus
    { wch: 12 }, // channel
    { wch: 12 }, // status
    { wch: 12 }, // taxAmount
  ]

  XLSX.utils.book_append_sheet(wb, salesSheet, "Sales")

  // Summary sheet
  const summary = generateRevenueSummary(orders, "daily")
  const summarySheet = XLSX.utils.json_to_sheet(
    summary.map((s) => ({
      Date: s.date,
      Orders: s.ordersCount,
      "Revenue (USD)": s.totalRevenueUsd,
      "Revenue (KHR)": s.totalRevenueKhr,
      "Avg Order Value": s.averageOrderValue,
      "Tax Amount": s.taxAmount,
    }))
  )
  XLSX.utils.book_append_sheet(wb, summarySheet, "Daily Summary")

  // Monthly summary sheet
  const monthlySummary = generateRevenueSummary(orders, "monthly")
  const monthlySheet = XLSX.utils.json_to_sheet(
    monthlySummary.map((s) => ({
      Month: s.date,
      Orders: s.ordersCount,
      "Revenue (USD)": s.totalRevenueUsd,
      "Revenue (KHR)": s.totalRevenueKhr,
      "Avg Order Value": s.averageOrderValue,
      "Taxable Amount": s.taxableAmount,
      "VAT Amount": s.taxAmount,
    }))
  )
  XLSX.utils.book_append_sheet(wb, monthlySheet, "Monthly Summary")

  // Generate buffer
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const filename = `sales-report-${startDate.toISOString().split("T")[0]}-to-${endDate.toISOString().split("T")[0]}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

// CSV Export
async function handleCSVExport(
  orders: OrderForExport[],
  startDate: Date,
  endDate: Date
) {
  const salesData = generateExcelSalesData(orders)
  const worksheet = XLSX.utils.json_to_sheet(salesData)
  const csv = XLSX.utils.sheet_to_csv(worksheet)
  const filename = `sales-export-${startDate.toISOString().split("T")[0]}-to-${endDate.toISOString().split("T")[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

// Tax Report Export
async function handleTaxExport(
  orders: OrderForExport[],
  startDate: Date,
  endDate: Date
) {
  const taxReport = generateTaxReport(orders, startDate, endDate)

  // Create Excel workbook for tax report
  const wb = XLSX.utils.book_new()

  // Summary sheet
  const summaryData = [
    { Field: "Period Start", Value: taxReport.periodStart },
    { Field: "Period End", Value: taxReport.periodEnd },
    { Field: "Total Sales (USD)", Value: taxReport.totalSales },
    { Field: "Taxable Sales (USD)", Value: taxReport.taxableSales },
    { Field: "Tax Exempt Sales (USD)", Value: taxReport.taxExemptSales },
    { Field: "VAT Amount (10%)", Value: taxReport.vatAmount },
  ]
  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summarySheet, "Tax Summary")

  // Category breakdown
  const categorySheet = XLSX.utils.json_to_sheet(
    taxReport.byCategory.map((c) => ({
      Category: c.category,
      "Sales (USD)": c.sales,
      "VAT Amount (USD)": c.taxAmount,
    }))
  )
  XLSX.utils.book_append_sheet(wb, categorySheet, "By Category")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const filename = `tax-report-${startDate.toISOString().split("T")[0]}-to-${endDate.toISOString().split("T")[0]}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

// Revenue Summary Export (JSON)
async function handleSummaryExport(
  orders: OrderForExport[],
  period: "daily" | "monthly"
) {
  const summary = generateRevenueSummary(orders, period)

  return NextResponse.json({
    period,
    data: summary,
    totals: {
      totalOrders: summary.reduce((sum, s) => sum + s.ordersCount, 0),
      totalRevenue: Number(
        summary.reduce((sum, s) => sum + s.totalRevenueUsd, 0).toFixed(2)
      ),
      totalTax: Number(
        summary.reduce((sum, s) => sum + s.taxAmount, 0).toFixed(2)
      ),
    },
    generatedAt: new Date().toISOString(),
  })
}

// Single Invoice Export (HTML/PDF)
async function handleInvoiceExport(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
      payments: true,
    },
  })

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  // Get shop settings
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ["shopName", "shopAddress", "shopPhone", "shopEmail", "shopTaxId"],
      },
    },
  })

  const settingsMap = new Map(settings.map((s) => [s.key, s.value as string]))

  const shopSettings = {
    name: settingsMap.get("shopName") || "ApoloShop",
    address: settingsMap.get("shopAddress") || "Phnom Penh, Cambodia",
    phone: settingsMap.get("shopPhone") || "+855 XX XXX XXXX",
    email: settingsMap.get("shopEmail") || "info@apoloshop.com",
    taxId: settingsMap.get("shopTaxId"),
  }

  const orderForExport: OrderForExport = {
    ...order,
    customer: order.customer,
    items: order.items,
    payments: order.payments,
  }

  const invoiceData = generateInvoiceData(orderForExport, shopSettings)
  const invoiceHTML = generateInvoiceHTML(invoiceData)

  return new NextResponse(invoiceHTML, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `inline; filename="invoice-${order.orderNumber}.html"`,
    },
  })
}
