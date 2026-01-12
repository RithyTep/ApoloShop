"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, FileSpreadsheet, FileText, Calendar, Award } from "lucide-react"
import { useSalesReport } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

export function ReportsPage() {
  const { toast } = useToast()
  const [dateRange, setDateRange] = useState("30d")
  const [isExporting, setIsExporting] = useState(false)

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

  const { data, isLoading, error } = useSalesReport({ startDate, endDate })

  const handleExport = async (type: string, format: "csv" | "json") => {
    setIsExporting(true)
    toast({ title: "Export started", description: "Your report is being generated..." })

    try {
      const params = new URLSearchParams({
        type,
        format,
        dateFrom: startDate,
        dateTo: endDate,
      })

      const response = await fetch(`/api/export?${params}`)

      if (!response.ok) {
        throw new Error("Export failed")
      }

      if (format === "csv") {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${type}-report-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const result = await response.json()
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${type}-report-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      toast({ title: "Export complete", description: "Report has been downloaded" })
    } catch (err) {
      toast({ title: "Export failed", description: (err as Error).message, variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sales Reports</h1>
            <p className="text-muted-foreground mt-2">Comprehensive sales analytics and business insights</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-[300px] w-full" />
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-6 text-center">
          <p className="text-destructive">Failed to load sales report data</p>
          <p className="text-muted-foreground text-sm mt-2">{error.message}</p>
        </Card>
      </div>
    )
  }

  const summary = data?.summary
  const topProducts = data?.topProducts || []
  const salesByCategory = data?.salesByCategory || []
  const salesByChannel = data?.salesByChannel || []
  const topCustomers = data?.topCustomers || []
  const chartData = data?.chartData || []

  const summaryCards = [
    {
      label: "Total Revenue",
      value: summary?.totalRevenue || 0,
      change: summary?.revenueChange || 0,
      icon: DollarSign,
      format: "currency",
      khrValue: summary?.totalRevenueKhr || 0,
    },
    {
      label: "Total Orders",
      value: summary?.orderCount || 0,
      change: summary?.orderCountChange || 0,
      icon: ShoppingCart,
      format: "number",
    },
    {
      label: "Avg Order Value",
      value: summary?.averageOrderValue || 0,
      icon: TrendingUp,
      format: "currency",
    },
    {
      label: "Cancelled Orders",
      value: summary?.cancelledOrders || 0,
      icon: Package,
      format: "number",
      isWarning: (summary?.cancelledOrders || 0) > 0,
    },
  ]

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`
  const formatKhr = (value: number) => `៛${value.toLocaleString()}`

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Reports</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive sales analytics and business insights
          </p>
          {summary?.dateRange && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {summary.dateRange.start} to {summary.dateRange.end}
            </p>
          )}
        </div>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isExporting} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Download size={16} /> {isExporting ? "Exporting..." : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleExport("sales", "csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Sales Report (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("orders", "csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Orders (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("products", "csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Products (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("sales", "json")}>
                <FileText className="mr-2 h-4 w-4" />
                Sales Report (JSON)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">{card.label}</h3>
                <Icon className={`h-4 w-4 ${card.isWarning ? "text-warning" : "text-muted-foreground"}`} />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">
                {card.format === "currency"
                  ? formatCurrency(card.value)
                  : card.value.toLocaleString()}
              </p>
              {card.khrValue !== undefined && (
                <p className="text-sm text-muted-foreground">{formatKhr(card.khrValue)}</p>
              )}
              {card.change !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${card.change >= 0 ? "text-success" : "text-destructive"}`}>
                  {card.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{card.change >= 0 ? "+" : ""}{card.change}% vs previous period</span>
                </div>
              )}
              {card.isWarning && <p className="text-xs text-warning mt-2">Review cancelled orders</p>}
            </Card>
          )
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Revenue Trend</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]} labelFormatter={(label) => new Date(label).toLocaleDateString()} />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No revenue data available
            </div>
          )}
        </Card>

        {/* Orders by Day */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Orders by Day</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip formatter={(value) => [value, "Orders"]} labelFormatter={(label) => new Date(label).toLocaleDateString()} />
                <Bar dataKey="orderCount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No order data available
            </div>
          )}
        </Card>
      </div>

      {/* Charts Row 2 - Category & Channel Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Sales by Category</h2>
          {salesByCategory.length > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie
                    data={salesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="revenue"
                    nameKey="nameEn"
                  >
                    {salesByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 max-h-[250px] overflow-y-auto">
                {salesByCategory.map((cat, index) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-foreground truncate">{cat.nameEn}</span>
                    <span className="text-sm text-muted-foreground ml-auto">{cat.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No category data available
            </div>
          )}
        </Card>

        {/* Sales by Channel */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Sales by Channel</h2>
          {salesByChannel.length > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie
                    data={salesByChannel}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="revenue"
                    nameKey="channel"
                  >
                    {salesByChannel.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {salesByChannel.map((ch, index) => (
                  <div key={ch.channel} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-foreground">{ch.channel.replace("_", " ")}</span>
                    <span className="text-sm text-muted-foreground ml-auto">{ch.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No channel data available
            </div>
          )}
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Table */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Top Products</h2>
          </div>
          {topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="text-foreground font-semibold w-10">#</TableHead>
                    <TableHead className="text-foreground font-semibold">Product</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">Qty</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.slice(0, 5).map((product) => (
                    <TableRow key={product.id} className="border-b border-border hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{product.rank}</TableCell>
                      <TableCell>
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
                            <p className="text-xs text-muted-foreground truncate">{product.category?.nameEn || "No category"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-foreground">{product.quantity}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">{formatCurrency(product.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No product sales data available
            </div>
          )}
        </Card>

        {/* Top Customers Table */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Top Customers</h2>
          </div>
          {topCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="text-foreground font-semibold w-10">#</TableHead>
                    <TableHead className="text-foreground font-semibold">Customer</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">Orders</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.slice(0, 5).map((customer) => (
                    <TableRow key={customer.id} className="border-b border-border hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{customer.rank}</TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            AOV: {formatCurrency(customer.averageOrderValue)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-foreground">{customer.orderCount}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">{formatCurrency(customer.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No customer data available
            </div>
          )}
        </Card>
      </div>

      {/* Average Order Value Trend */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Average Order Value Trend</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, "Avg Order Value"]} labelFormatter={(label) => new Date(label).toLocaleDateString()} />
              <Line type="monotone" dataKey="averageOrderValue" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No data available for selected period
          </div>
        )}
      </Card>
    </div>
  )
}
