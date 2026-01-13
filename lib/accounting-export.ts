// Accounting Export Utilities
// Supports QuickBooks IIF, Excel, CSV formats

import { Decimal } from "@prisma/client/runtime/library"

// Types
export interface OrderForExport {
  id: string
  orderNumber: string
  createdAt: Date
  status: string
  totalUsd: Decimal | number
  totalKhr: number
  currency: string
  channel: string
  discountUsd?: Decimal | number | null
  discountKhr?: number | null
  customer: {
    id: string
    name: string
    phone: string
    email?: string | null
  }
  items: Array<{
    id: string
    quantity: number
    priceUsd: Decimal | number
    priceKhr: number
    productName?: string | null
    product?: {
      id: string
      nameEn: string
      sku: string
      category?: {
        nameEn: string
      } | null
    } | null
  }>
  payments?: Array<{
    id: string
    method: string
    amount: Decimal | number
    currency: string
    status: string
    createdAt: Date
  }>
}

export interface RevenueSummary {
  date: string
  periodType: "daily" | "monthly"
  ordersCount: number
  totalRevenueUsd: number
  totalRevenueKhr: number
  averageOrderValue: number
  paymentBreakdown: Record<string, number>
  channelBreakdown: Record<string, number>
  taxableAmount: number
  taxAmount: number
}

export interface TaxReport {
  periodStart: string
  periodEnd: string
  totalSales: number
  taxableSales: number
  taxExemptSales: number
  vatAmount: number // Cambodia VAT is 10%
  byCategory: Array<{
    category: string
    sales: number
    taxAmount: number
  }>
}

// Cambodia VAT rate
const CAMBODIA_VAT_RATE = 0.10

// QuickBooks IIF Format Generator
export function generateQuickBooksIIF(orders: OrderForExport[]): string {
  const lines: string[] = []

  // IIF Header for transactions
  lines.push("!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO")
  lines.push("!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO")
  lines.push("!ENDTRNS")

  for (const order of orders) {
    if (order.status !== "COMPLETED" && order.status !== "READY") continue

    const amount = Number(order.totalUsd)
    const date = formatIIFDate(order.createdAt)
    const docNum = order.orderNumber
    const memo = `Order ${order.orderNumber} - ${order.channel}`

    // Main transaction line (Sales receipt)
    lines.push(`TRNS\t\tSALES RECEIPT\t${date}\tAccounts Receivable\t${escapeIIF(order.customer.name)}\t\t${amount.toFixed(2)}\t${docNum}\t${escapeIIF(memo)}`)

    // Split lines for each item
    for (const item of order.items) {
      const itemAmount = Number(item.priceUsd) * item.quantity * -1 // Negative for split
      const itemName = item.product?.nameEn || item.productName || "Unknown Product"
      const category = item.product?.category?.nameEn || "Sales"

      lines.push(`SPL\t\tSALES RECEIPT\t${date}\tSales:${escapeIIF(category)}\t${escapeIIF(order.customer.name)}\t\t${itemAmount.toFixed(2)}\t${docNum}\t${escapeIIF(itemName)}`)
    }

    lines.push("ENDTRNS")
  }

  return lines.join("\n")
}

// Format date for IIF (MM/DD/YYYY)
function formatIIFDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

// Escape special characters for IIF
function escapeIIF(str: string): string {
  return str.replace(/\t/g, " ").replace(/\n/g, " ").replace(/\r/g, "")
}

// Excel-compatible sales data format
export interface ExcelSalesRow {
  orderNumber: string
  orderDate: string
  customerName: string
  customerPhone: string
  customerEmail: string
  items: string
  itemCount: number
  subtotalUsd: number
  discountUsd: number
  totalUsd: number
  totalKhr: number
  currency: string
  paymentMethod: string
  paymentStatus: string
  channel: string
  status: string
  taxAmount: number
}

export function generateExcelSalesData(orders: OrderForExport[]): ExcelSalesRow[] {
  return orders.map((order) => {
    const subtotal = order.items.reduce(
      (sum, item) => sum + Number(item.priceUsd) * item.quantity,
      0
    )
    const discount = Number(order.discountUsd || 0)
    const total = Number(order.totalUsd)
    const taxAmount = total * CAMBODIA_VAT_RATE

    // Get primary payment method and status
    const primaryPayment = order.payments?.[0]
    const paymentMethod = primaryPayment?.method || "CASH"
    const paymentStatus = primaryPayment?.status || "PENDING"

    // Format items as comma-separated list
    const itemsList = order.items
      .map((item) => {
        const name = item.product?.nameEn || item.productName || "Unknown"
        return `${name} x${item.quantity}`
      })
      .join(", ")

    return {
      orderNumber: order.orderNumber,
      orderDate: order.createdAt.toISOString().split("T")[0],
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      customerEmail: order.customer.email || "",
      items: itemsList,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalUsd: Number(subtotal.toFixed(2)),
      discountUsd: Number(discount.toFixed(2)),
      totalUsd: Number(total.toFixed(2)),
      totalKhr: order.totalKhr,
      currency: order.currency,
      paymentMethod,
      paymentStatus,
      channel: order.channel,
      status: order.status,
      taxAmount: Number(taxAmount.toFixed(2)),
    }
  })
}

// Daily/Monthly Revenue Summary
export function generateRevenueSummary(
  orders: OrderForExport[],
  periodType: "daily" | "monthly"
): RevenueSummary[] {
  const summaries = new Map<string, RevenueSummary>()

  for (const order of orders) {
    if (order.status !== "COMPLETED" && order.status !== "READY") continue

    const date = order.createdAt
    const periodKey =
      periodType === "daily"
        ? date.toISOString().split("T")[0]
        : `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`

    const existing = summaries.get(periodKey) || {
      date: periodKey,
      periodType,
      ordersCount: 0,
      totalRevenueUsd: 0,
      totalRevenueKhr: 0,
      averageOrderValue: 0,
      paymentBreakdown: {},
      channelBreakdown: {},
      taxableAmount: 0,
      taxAmount: 0,
    }

    const orderTotal = Number(order.totalUsd)

    existing.ordersCount++
    existing.totalRevenueUsd += orderTotal
    existing.totalRevenueKhr += order.totalKhr
    existing.taxableAmount += orderTotal / (1 + CAMBODIA_VAT_RATE) // Extract pre-tax amount
    existing.taxAmount += orderTotal - orderTotal / (1 + CAMBODIA_VAT_RATE)

    // Payment breakdown
    const paymentMethod = order.payments?.[0]?.method || "CASH"
    existing.paymentBreakdown[paymentMethod] =
      (existing.paymentBreakdown[paymentMethod] || 0) + orderTotal

    // Channel breakdown
    existing.channelBreakdown[order.channel] =
      (existing.channelBreakdown[order.channel] || 0) + orderTotal

    summaries.set(periodKey, existing)
  }

  // Calculate averages
  const result = Array.from(summaries.values()).map((summary) => ({
    ...summary,
    averageOrderValue:
      summary.ordersCount > 0
        ? Number((summary.totalRevenueUsd / summary.ordersCount).toFixed(2))
        : 0,
    totalRevenueUsd: Number(summary.totalRevenueUsd.toFixed(2)),
    taxableAmount: Number(summary.taxableAmount.toFixed(2)),
    taxAmount: Number(summary.taxAmount.toFixed(2)),
  }))

  return result.sort((a, b) => a.date.localeCompare(b.date))
}

// Tax Report Generation
export function generateTaxReport(
  orders: OrderForExport[],
  startDate: Date,
  endDate: Date
): TaxReport {
  const categoryTax = new Map<string, { sales: number; tax: number }>()
  let totalSales = 0
  let taxableSales = 0

  for (const order of orders) {
    if (order.status !== "COMPLETED" && order.status !== "READY") continue

    const orderDate = new Date(order.createdAt)
    if (orderDate < startDate || orderDate > endDate) continue

    const orderTotal = Number(order.totalUsd)
    totalSales += orderTotal

    // Calculate tax per item category
    for (const item of order.items) {
      const itemTotal = Number(item.priceUsd) * item.quantity
      const category = item.product?.category?.nameEn || "Uncategorized"
      const itemTax = itemTotal * CAMBODIA_VAT_RATE

      taxableSales += itemTotal

      const existing = categoryTax.get(category) || { sales: 0, tax: 0 }
      existing.sales += itemTotal
      existing.tax += itemTax
      categoryTax.set(category, existing)
    }
  }

  const vatAmount = taxableSales * CAMBODIA_VAT_RATE

  return {
    periodStart: startDate.toISOString().split("T")[0],
    periodEnd: endDate.toISOString().split("T")[0],
    totalSales: Number(totalSales.toFixed(2)),
    taxableSales: Number(taxableSales.toFixed(2)),
    taxExemptSales: 0, // Currently all sales are taxable
    vatAmount: Number(vatAmount.toFixed(2)),
    byCategory: Array.from(categoryTax.entries())
      .map(([category, data]) => ({
        category,
        sales: Number(data.sales.toFixed(2)),
        taxAmount: Number(data.tax.toFixed(2)),
      }))
      .sort((a, b) => b.sales - a.sales),
  }
}

// Invoice PDF Data Structure
export interface InvoiceData {
  invoiceNumber: string
  orderNumber: string
  issueDate: string
  dueDate: string
  // Seller info
  sellerName: string
  sellerAddress: string
  sellerPhone: string
  sellerEmail: string
  sellerTaxId?: string
  // Buyer info
  buyerName: string
  buyerPhone: string
  buyerEmail?: string
  buyerAddress?: string
  // Items
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  // Totals
  subtotal: number
  discount: number
  taxRate: number
  taxAmount: number
  total: number
  totalKhr: number
  currency: string
  // Payment info
  paymentMethod: string
  paymentStatus: string
  paidAt?: string
  // Footer
  notes?: string
  terms?: string
}

export function generateInvoiceData(
  order: OrderForExport,
  shopSettings: {
    name: string
    address: string
    phone: string
    email: string
    taxId?: string
  }
): InvoiceData {
  const subtotal = order.items.reduce(
    (sum, item) => sum + Number(item.priceUsd) * item.quantity,
    0
  )
  const discount = Number(order.discountUsd || 0)
  const total = Number(order.totalUsd)
  const taxAmount = subtotal * CAMBODIA_VAT_RATE

  const primaryPayment = order.payments?.[0]
  const issueDate = order.createdAt
  const dueDate = new Date(issueDate)
  dueDate.setDate(dueDate.getDate() + 30) // 30 days payment terms

  return {
    invoiceNumber: `INV-${order.orderNumber}`,
    orderNumber: order.orderNumber,
    issueDate: issueDate.toISOString().split("T")[0],
    dueDate: dueDate.toISOString().split("T")[0],
    // Seller
    sellerName: shopSettings.name,
    sellerAddress: shopSettings.address,
    sellerPhone: shopSettings.phone,
    sellerEmail: shopSettings.email,
    sellerTaxId: shopSettings.taxId,
    // Buyer
    buyerName: order.customer.name,
    buyerPhone: order.customer.phone,
    buyerEmail: order.customer.email || undefined,
    // Items
    items: order.items.map((item) => ({
      description: item.product?.nameEn || item.productName || "Product",
      quantity: item.quantity,
      unitPrice: Number(item.priceUsd),
      totalPrice: Number(item.priceUsd) * item.quantity,
    })),
    // Totals
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    taxRate: CAMBODIA_VAT_RATE * 100,
    taxAmount: Number(taxAmount.toFixed(2)),
    total: Number(total.toFixed(2)),
    totalKhr: order.totalKhr,
    currency: order.currency,
    // Payment
    paymentMethod: primaryPayment?.method || "CASH",
    paymentStatus: primaryPayment?.status || "PENDING",
    paidAt:
      primaryPayment?.status === "COMPLETED"
        ? primaryPayment.createdAt.toISOString().split("T")[0]
        : undefined,
    // Footer
    notes: "Thank you for your business!",
    terms: "Payment due within 30 days. Cambodia VAT 10% included.",
  }
}

// Generate invoice HTML for PDF conversion
export function generateInvoiceHTML(invoice: InvoiceData): string {
  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatKHR = (amount: number) =>
    `៛${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #333; padding: 40px; }
    .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company-info { max-width: 250px; }
    .company-name { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 8px; }
    .company-details { font-size: 11px; color: #666; line-height: 1.5; }
    .invoice-info { text-align: right; }
    .invoice-title { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 8px; }
    .invoice-number { font-size: 14px; color: #666; margin-bottom: 4px; }
    .invoice-date { font-size: 11px; color: #666; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { max-width: 45%; }
    .party-label { font-size: 10px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 8px; }
    .party-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
    .party-details { font-size: 11px; color: #666; line-height: 1.5; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
    .items-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .items-table .text-right { text-align: right; }
    .items-table .qty { width: 60px; text-align: center; }
    .items-table .price { width: 100px; }
    .items-table .total { width: 100px; font-weight: 500; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .totals-table { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .totals-row.grand-total { font-size: 16px; font-weight: bold; color: #2563eb; border-top: 2px solid #2563eb; border-bottom: none; padding-top: 12px; }
    .payment-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .payment-title { font-size: 12px; font-weight: bold; margin-bottom: 12px; }
    .payment-row { display: flex; margin-bottom: 8px; }
    .payment-label { width: 120px; color: #666; }
    .payment-value { font-weight: 500; }
    .status-paid { color: #10b981; }
    .status-pending { color: #f59e0b; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 10px; color: #666; }
    .footer-notes { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="invoice-header">
    <div class="company-info">
      <div class="company-name">${invoice.sellerName}</div>
      <div class="company-details">
        ${invoice.sellerAddress}<br>
        ${invoice.sellerPhone}<br>
        ${invoice.sellerEmail}
        ${invoice.sellerTaxId ? `<br>Tax ID: ${invoice.sellerTaxId}` : ""}
      </div>
    </div>
    <div class="invoice-info">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">${invoice.invoiceNumber}</div>
      <div class="invoice-date">
        Issue Date: ${invoice.issueDate}<br>
        Due Date: ${invoice.dueDate}
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Bill To</div>
      <div class="party-name">${invoice.buyerName}</div>
      <div class="party-details">
        ${invoice.buyerPhone}
        ${invoice.buyerEmail ? `<br>${invoice.buyerEmail}` : ""}
        ${invoice.buyerAddress ? `<br>${invoice.buyerAddress}` : ""}
      </div>
    </div>
    <div class="party">
      <div class="party-label">Order Reference</div>
      <div class="party-name">${invoice.orderNumber}</div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th class="qty">Qty</th>
        <th class="price text-right">Unit Price</th>
        <th class="total text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items
        .map(
          (item) => `
        <tr>
          <td>${item.description}</td>
          <td class="qty">${item.quantity}</td>
          <td class="price text-right">${formatCurrency(item.unitPrice)}</td>
          <td class="total text-right">${formatCurrency(item.totalPrice)}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatCurrency(invoice.subtotal)}</span>
      </div>
      ${
        invoice.discount > 0
          ? `
        <div class="totals-row">
          <span>Discount</span>
          <span>-${formatCurrency(invoice.discount)}</span>
        </div>
      `
          : ""
      }
      <div class="totals-row">
        <span>VAT (${invoice.taxRate}%)</span>
        <span>${formatCurrency(invoice.taxAmount)}</span>
      </div>
      <div class="totals-row grand-total">
        <span>Total</span>
        <span>${formatCurrency(invoice.total)}</span>
      </div>
      <div class="totals-row" style="color: #666; font-size: 11px;">
        <span>KHR Equivalent</span>
        <span>${formatKHR(invoice.totalKhr)}</span>
      </div>
    </div>
  </div>

  <div class="payment-info">
    <div class="payment-title">Payment Information</div>
    <div class="payment-row">
      <span class="payment-label">Payment Method:</span>
      <span class="payment-value">${invoice.paymentMethod.replace("_", " ")}</span>
    </div>
    <div class="payment-row">
      <span class="payment-label">Status:</span>
      <span class="payment-value ${invoice.paymentStatus === "COMPLETED" ? "status-paid" : "status-pending"}">
        ${invoice.paymentStatus}
      </span>
    </div>
    ${
      invoice.paidAt
        ? `
      <div class="payment-row">
        <span class="payment-label">Paid On:</span>
        <span class="payment-value">${invoice.paidAt}</span>
      </div>
    `
        : ""
    }
  </div>

  <div class="footer">
    ${invoice.notes ? `<div class="footer-notes">${invoice.notes}</div>` : ""}
    ${invoice.terms ? `<div class="footer-terms">${invoice.terms}</div>` : ""}
  </div>
</body>
</html>`
}
