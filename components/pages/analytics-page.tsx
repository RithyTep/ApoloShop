"use client"

import { useState, useMemo, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Legend,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Target,
  FileDown,
  Calendar,
  BarChart3,
  Package,
  ArrowDown,
  Percent,
} from "lucide-react"
import { useAdvancedAnalytics } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import {
  AdminPageHeader,
  AdminDataCard,
  AdminTable,
  AdminTableHeader,
  AdminTableHeadRow,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]
const FUNNEL_COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"]

export function AnalyticsPage() {
  const { toast } = useToast()
  const [dateRange, setDateRange] = useState("30d")
  const [isExporting, setIsExporting] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  // Calculate date range based on selection
  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    const dateFrom = new Date()
    switch (dateRange) {
      case "7d":
        dateFrom.setDate(now.getDate() - 7)
        break
      case "30d":
        dateFrom.setDate(now.getDate() - 30)
        break
      case "90d":
        dateFrom.setDate(now.getDate() - 90)
        break
      case "365d":
        dateFrom.setFullYear(now.getFullYear() - 1)
        break
    }
    return {
      startDate: dateFrom.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0],
    }
  }, [dateRange])

  const { data, isLoading, error } = useAdvancedAnalytics({ startDate, endDate })

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`
  const formatPercent = (value: number) => `${value}%`

  // Export to PDF functionality
  const handleExportPdf = async () => {
    setIsExporting(true)
    toast({ title: "Generating PDF", description: "Please wait while we prepare your report..." })

    try {
      // Dynamic import of html2canvas and jspdf for PDF generation
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])

      if (!reportRef.current) {
        throw new Error("Report container not found")
      }

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      // Add title
      pdf.setFontSize(20)
      pdf.text("Advanced Analytics Report", 105, 15, { align: "center" })
      pdf.setFontSize(10)
      pdf.text(`Period: ${startDate} to ${endDate}`, 105, 22, { align: "center" })
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 28, { align: "center" })

      position = 35

      // Add image with pagination
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - position

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`analytics-report-${startDate}-to-${endDate}.pdf`)
      toast({ title: "PDF exported", description: "Report has been downloaded successfully" })
    } catch (err) {
      console.error("PDF export error:", err)
      toast({
        title: "Export failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <AdminLoading
        title="Advanced Analytics"
        subtitle="Business intelligence and performance insights"
        rows={4}
      />
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-6 text-center">
          <p className="text-destructive">Failed to load analytics data</p>
          <p className="text-muted-foreground text-sm mt-2">{error.message}</p>
        </Card>
      </div>
    )
  }

  const summary = data?.summary
  const revenueTrends = data?.revenueTrends || []
  const conversionFunnel = data?.conversionFunnel || []
  const productPerformance = data?.productPerformance || []
  const customerCohorts = data?.customerCohorts || []

  // Summary KPI cards
  const summaryCards = [
    {
      label: "Total Revenue",
      value: summary?.totalRevenue || 0,
      previousValue: summary?.previousTotalRevenue || 0,
      change: summary?.revenueGrowth || 0,
      icon: DollarSign,
      format: "currency",
    },
    {
      label: "Total Orders",
      value: summary?.totalOrders || 0,
      previousValue: summary?.previousTotalOrders || 0,
      change: summary?.ordersGrowth || 0,
      icon: ShoppingCart,
      format: "number",
    },
    {
      label: "Avg Order Value",
      value: summary?.avgOrderValue || 0,
      previousValue: summary?.previousAvgOrderValue || 0,
      change: summary?.aovGrowth || 0,
      icon: Target,
      format: "currency",
    },
    {
      label: "Conversion Rate",
      value: summary?.conversionRate || 0,
      icon: Users,
      format: "percent",
    },
  ]

  // Prepare scatter data for product performance matrix
  const scatterData = productPerformance.map((p) => ({
    ...p,
    x: p.revenue,
    y: p.marginPercent,
    z: p.quantity,
  }))

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Advanced Analytics"
        subtitle="Business intelligence and performance insights"
      >
        <div className="flex gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="365d">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <FileDown size={16} />
            {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </AdminPageHeader>

      <p className="text-sm text-muted-foreground flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {startDate} to {endDate}
      </p>

      {/* Report content for PDF export */}
      <div ref={reportRef} className="space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => {
            const Icon = card.icon
            return (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">{card.label}</h3>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {card.format === "currency"
                    ? formatCurrency(card.value)
                    : card.format === "percent"
                    ? formatPercent(card.value)
                    : card.value.toLocaleString()}
                </p>
                {card.previousValue !== undefined && card.change !== undefined && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`flex items-center gap-1 text-xs ${card.change >= 0 ? "text-success" : "text-destructive"}`}>
                      {card.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>{card.change >= 0 ? "+" : ""}{card.change}%</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      vs prev. period ({card.format === "currency" ? formatCurrency(card.previousValue) : card.previousValue.toLocaleString()})
                    </span>
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {/* Revenue Trends with Comparison */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Revenue Trends with Period Comparison</h2>
          </div>
          {revenueTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={revenueTrends}>
                <defs>
                  <linearGradient id="colorCurrentRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
                <YAxis
                  yAxisId="left"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value, name) => [
                    name === "revenue" || name === "previousRevenue"
                      ? `$${Number(value).toFixed(2)}`
                      : value,
                    name === "revenue"
                      ? "Current Revenue"
                      : name === "previousRevenue"
                      ? "Previous Period"
                      : name === "orderCount"
                      ? "Orders"
                      : "Prev Orders",
                  ]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name="Current Revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCurrentRevenue)"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="previousRevenue"
                  name="Previous Period"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Bar
                  yAxisId="right"
                  dataKey="orderCount"
                  name="Orders"
                  fill="#10b981"
                  opacity={0.6}
                  radius={[2, 2, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <AdminEmptyState message="No revenue data available for selected period" />
          )}
        </Card>

        {/* Conversion Funnel */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Conversion Funnel</h2>
          </div>
          {conversionFunnel.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Funnel Visualization */}
              <div className="w-full lg:w-1/2 flex flex-col items-center">
                {conversionFunnel.map((stage, index) => {
                  const width = 100 - index * 15 // Decrease width for each stage
                  return (
                    <div key={stage.stage} className="w-full flex flex-col items-center">
                      <div
                        className="relative flex items-center justify-center py-4 text-white font-medium transition-all hover:opacity-90"
                        style={{
                          width: `${width}%`,
                          backgroundColor: FUNNEL_COLORS[index % FUNNEL_COLORS.length],
                          clipPath: index === conversionFunnel.length - 1
                            ? "polygon(5% 0, 95% 0, 100% 100%, 0% 100%)"
                            : "polygon(0 0, 100% 0, 95% 100%, 5% 100%)",
                        }}
                      >
                        <span className="text-sm lg:text-base">{stage.stage}</span>
                        <span className="absolute right-4 text-xs opacity-80">
                          {stage.count.toLocaleString()}
                        </span>
                      </div>
                      {index < conversionFunnel.length - 1 && stage.dropoff > 0 && (
                        <div className="flex items-center gap-1 py-1 text-destructive text-xs">
                          <ArrowDown className="h-3 w-3" />
                          <span>{stage.dropoff}% drop-off</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Funnel Stats Table */}
              <div className="w-full lg:w-1/2">
                <AdminTable>
                  <AdminTableHeader>
                    <AdminTableHeadRow>
                      <AdminTableHead>Stage</AdminTableHead>
                      <AdminTableHead className="text-right">Count</AdminTableHead>
                      <AdminTableHead className="text-right">% of Total</AdminTableHead>
                      <AdminTableHead className="text-right">Drop-off</AdminTableHead>
                    </AdminTableHeadRow>
                  </AdminTableHeader>
                  <AdminTableBody>
                    {conversionFunnel.map((stage, index) => (
                      <AdminTableRow key={stage.stage}>
                        <AdminTableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: FUNNEL_COLORS[index % FUNNEL_COLORS.length] }}
                            />
                            {stage.stage}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell className="text-right">{stage.count.toLocaleString()}</AdminTableCell>
                        <AdminTableCell className="text-right">{stage.percentage}%</AdminTableCell>
                        <AdminTableCell className={`text-right ${stage.dropoff > 0 ? "text-destructive" : ""}`}>
                          {stage.dropoff > 0 ? `-${stage.dropoff}%` : "-"}
                        </AdminTableCell>
                      </AdminTableRow>
                    ))}
                  </AdminTableBody>
                </AdminTable>
              </div>
            </div>
          ) : (
            <AdminEmptyState message="No conversion data available" />
          )}
        </Card>

        {/* Product Performance Matrix */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Product Performance Matrix (Revenue vs Margin)</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Bubble size indicates quantity sold. Products in the top-right quadrant are stars (high revenue + high margin).
          </p>
          {scatterData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scatter Chart */}
              <div>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Revenue"
                      stroke="var(--color-muted-foreground)"
                      fontSize={12}
                      tickFormatter={(value) => `$${value}`}
                      label={{ value: "Revenue ($)", position: "insideBottomRight", offset: -5 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Margin %"
                      stroke="var(--color-muted-foreground)"
                      fontSize={12}
                      tickFormatter={(value) => `${value}%`}
                      label={{ value: "Margin %", angle: -90, position: "insideLeft" }}
                    />
                    <ZAxis type="number" dataKey="z" range={[50, 400]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(value, name) =>
                        name === "Revenue" ? [`$${Number(value).toFixed(2)}`, name] : [`${value}%`, name]
                      }
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-medium text-foreground">{data.nameEn}</p>
                              <p className="text-xs text-muted-foreground">{data.sku}</p>
                              <div className="mt-2 space-y-1 text-sm">
                                <p>Revenue: {formatCurrency(data.revenue)}</p>
                                <p>Margin: {data.marginPercent}%</p>
                                <p>Qty Sold: {data.quantity}</p>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <ReferenceLine
                      y={40}
                      stroke="#10b981"
                      strokeDasharray="3 3"
                      label={{ value: "Target Margin 40%", fill: "#10b981", fontSize: 10 }}
                    />
                    <Scatter
                      name="Products"
                      data={scatterData}
                      fill="#3b82f6"
                    >
                      {scatterData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.marginPercent >= 40 && entry.revenue >= (scatterData.reduce((a, b) => a + b.revenue, 0) / scatterData.length) ? "#10b981" : "#3b82f6"}
                          opacity={0.7}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Top Products Table */}
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <AdminTable>
                  <AdminTableHeader>
                    <AdminTableHeadRow>
                      <AdminTableHead>Product</AdminTableHead>
                      <AdminTableHead className="text-right">Revenue</AdminTableHead>
                      <AdminTableHead className="text-right">Margin</AdminTableHead>
                      <AdminTableHead className="text-right">Qty</AdminTableHead>
                    </AdminTableHeadRow>
                  </AdminTableHeader>
                  <AdminTableBody>
                    {productPerformance.slice(0, 15).map((product) => (
                      <AdminTableRow key={product.id}>
                        <AdminTableCell>
                          <div className="flex items-center gap-2">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.nameEn}
                                className="w-8 h-8 rounded object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{product.nameEn}</p>
                              <p className="text-xs text-muted-foreground">{product.sku}</p>
                            </div>
                          </div>
                        </AdminTableCell>
                        <AdminTableCell className="text-right font-medium">{formatCurrency(product.revenue)}</AdminTableCell>
                        <AdminTableCell className={`text-right ${product.marginPercent >= 40 ? "text-success" : product.marginPercent < 20 ? "text-destructive" : ""}`}>
                          <div className="flex items-center justify-end gap-1">
                            <Percent className="h-3 w-3" />
                            {product.marginPercent}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell className="text-right">{product.quantity}</AdminTableCell>
                      </AdminTableRow>
                    ))}
                  </AdminTableBody>
                </AdminTable>
              </div>
            </div>
          ) : (
            <AdminEmptyState message="No product performance data available" />
          )}
        </Card>

        {/* Customer Cohort Analysis */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Customer Cohort Analysis</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Shows customer retention by signup month. Each row is a cohort (customers who made their first purchase in that month).
            Each column shows what percentage returned in subsequent months.
          </p>
          {customerCohorts.length > 0 ? (
            <div className="overflow-x-auto">
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableHeadRow>
                    <AdminTableHead>Cohort</AdminTableHead>
                    <AdminTableHead className="text-center">Size</AdminTableHead>
                    {customerCohorts[0]?.retention.map((_, index) => (
                      <AdminTableHead key={index} className="text-center">
                        {index === 0 ? "Month 0" : `+${index}`}
                      </AdminTableHead>
                    ))}
                  </AdminTableHeadRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {customerCohorts.map((cohort) => (
                    <AdminTableRow key={cohort.cohortMonth}>
                      <AdminTableCell className="font-medium">
                        {new Date(cohort.cohortMonth + "-01").toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </AdminTableCell>
                      <AdminTableCell className="text-center font-medium">{cohort.cohortSize}</AdminTableCell>
                      {cohort.retention.map((value, index) => {
                        // Color intensity based on retention
                        const intensity = value / 100
                        const bgColor = `rgba(16, 185, 129, ${intensity * 0.8})`
                        const textColor = intensity > 0.5 ? "white" : "inherit"
                        return (
                          <AdminTableCell
                            key={index}
                            className="text-center font-medium"
                            style={{
                              backgroundColor: bgColor,
                              color: textColor,
                            }}
                          >
                            {value}%
                          </AdminTableCell>
                        )
                      })}
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            </div>
          ) : (
            <AdminEmptyState message="No cohort data available. Need at least 1 month of order history." />
          )}
        </Card>
      </div>
    </div>
  )
}
