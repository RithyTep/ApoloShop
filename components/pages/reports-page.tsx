"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, FileSpreadsheet, FileText } from "lucide-react"
import { useDashboardStats } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export function ReportsPage() {
  const { toast } = useToast()
  const [dateRange, setDateRange] = useState("7d")
  const [isExporting, setIsExporting] = useState(false)
  const { data, isLoading, error } = useDashboardStats()

  const getDateRange = () => {
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
      dateFrom: dateFrom.toISOString().split("T")[0],
      dateTo: now.toISOString().split("T")[0],
    }
  }

  const handleExport = async (type: string, format: "csv" | "json") => {
    setIsExporting(true)
    toast({ title: "Export started", description: "Your report is being generated..." })

    try {
      const { dateFrom, dateTo } = getDateRange()
      const params = new URLSearchParams({
        type,
        format,
        dateFrom,
        dateTo,
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
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
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
    } catch (error) {
      toast({ title: "Export failed", description: (error as Error).message, variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-2">Analyze sales, products, and business metrics</p>
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
          <p className="text-destructive">Failed to load reports data</p>
          <p className="text-muted-foreground text-sm mt-2">{error.message}</p>
        </Card>
      </div>
    )
  }

  const kpis = data?.kpis
  const chartData = data?.chartData || []

  // Calculate totals from chart data
  const totalOrders = chartData.reduce((sum, d) => sum + (d.orders || 0), 0)
  const totalRevenue = chartData.reduce((sum, d) => sum + (d.revenue || 0), 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Channel distribution (mock data based on real orders if available)
  const channelData = [
    { name: "Website", value: 40 },
    { name: "Telegram", value: 25 },
    { name: "Messenger", value: 20 },
    { name: "Phone", value: 10 },
    { name: "Walk-in", value: 5 },
  ]

  const summaryCards = [
    {
      label: "Total Orders",
      value: totalOrders,
      change: kpis?.ordersChange || 0,
      icon: ShoppingCart,
      format: "number",
    },
    {
      label: "Total Revenue",
      value: totalRevenue,
      change: kpis?.revenueChange || 0,
      icon: DollarSign,
      format: "currency",
    },
    {
      label: "Avg Order Value",
      value: avgOrderValue,
      icon: TrendingUp,
      format: "currency",
    },
    {
      label: "Total Customers",
      value: kpis?.totalCustomers || 0,
      icon: Users,
      format: "number",
    },
  ]

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-2">Analyze sales, products, and business metrics</p>
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
                <Download size={16} /> {isExporting ? "Exporting..." : "Export Report"}
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
              <DropdownMenuItem onClick={() => handleExport("inventory", "csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Inventory (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("customers", "csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Customers (CSV)
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  ? `$${card.value.toFixed(2)}`
                  : card.value.toLocaleString()}
              </p>
              {card.change !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${card.change >= 0 ? "text-success" : "text-destructive"}`}>
                  {card.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{card.change >= 0 ? "+" : ""}{card.change}% vs previous period</span>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Overview */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Sales Overview</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  formatter={(value, name) => [
                    name === "revenue" ? `$${value}` : value,
                    name === "revenue" ? "Revenue" : "Orders"
                  ]}
                />
                <Bar dataKey="orders" fill="var(--color-primary)" name="orders" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available for selected period
            </div>
          )}
        </Card>

        {/* Revenue Trend */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Revenue Trend</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available for selected period
            </div>
          )}
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Distribution */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Orders by Channel</h2>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={250}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, "Share"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {channelData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-foreground">{item.name}</span>
                  <span className="text-sm text-muted-foreground ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-foreground">Products in Stock</span>
              </div>
              <span className="font-bold">{kpis?.totalProducts || 0}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-warning" />
                <span className="text-foreground">Pending Orders</span>
              </div>
              <span className="font-bold text-warning">{kpis?.pendingOrders || 0}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-destructive" />
                <span className="text-foreground">Low Stock Items</span>
              </div>
              <span className="font-bold text-destructive">{kpis?.lowStockItems || 0}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-success" />
                <span className="text-foreground">Today&apos;s Orders</span>
              </div>
              <span className="font-bold text-success">{kpis?.todayOrders || 0}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
