"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardStats } from "@/lib/api-hooks"
import { TrendingUp, TrendingDown, Package, DollarSign, Clock, AlertTriangle } from "lucide-react"

export function DashboardPage() {
  const { data, isLoading, error } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back to your shop admin panel</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-[300px] w-full" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-[300px] w-full" />
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-6 text-center">
          <p className="text-destructive">Failed to load dashboard data</p>
          <p className="text-muted-foreground text-sm mt-2">{error.message}</p>
        </Card>
      </div>
    )
  }

  const kpis = data?.kpis
  const chartData = data?.chartData || []
  const recentOrders = data?.recentOrders || []

  const kpiCards = [
    {
      label: "Today Orders",
      value: kpis?.todayOrders || 0,
      change: kpis?.ordersChange || 0,
      icon: Package,
      format: "number",
    },
    {
      label: "Revenue",
      value: kpis?.revenueUsd || 0,
      change: kpis?.revenueChange || 0,
      icon: DollarSign,
      format: "currency",
      khrValue: kpis?.revenueKhr || 0,
    },
    {
      label: "Pending Orders",
      value: kpis?.pendingOrders || 0,
      icon: Clock,
      format: "number",
      isWarning: (kpis?.pendingOrders || 0) > 0,
    },
    {
      label: "Low Stock Items",
      value: kpis?.lowStockItems || 0,
      icon: AlertTriangle,
      format: "number",
      isUrgent: (kpis?.lowStockItems || 0) > 0,
    },
  ]

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`
  const formatKhr = (value: number) => `៛${value.toLocaleString()}`

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default"
      case "CANCELLED":
        return "destructive"
      case "NEW":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back to your shop admin panel</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">{kpi.label}</h3>
                <Icon className={`h-4 w-4 ${kpi.isUrgent ? "text-destructive" : kpi.isWarning ? "text-warning" : "text-muted-foreground"}`} />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">
                {kpi.format === "currency" ? formatCurrency(kpi.value) : kpi.value}
              </p>
              {kpi.khrValue !== undefined && (
                <p className="text-sm text-muted-foreground">{formatKhr(kpi.khrValue)}</p>
              )}
              {kpi.change !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${kpi.change >= 0 ? "text-success" : "text-destructive"}`}>
                  {kpi.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{kpi.change >= 0 ? "+" : ""}{kpi.change}% from yesterday</span>
                </div>
              )}
              {kpi.isWarning && <p className="text-xs text-warning mt-2">Need action</p>}
              {kpi.isUrgent && <p className="text-xs text-destructive mt-2">Urgent</p>}
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Orders by Day</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip />
                <Bar dataKey="orders" fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Revenue Trend</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          {recentOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-foreground font-semibold">Order ID</TableHead>
                  <TableHead className="text-foreground font-semibold">Customer</TableHead>
                  <TableHead className="text-foreground font-semibold">Phone</TableHead>
                  <TableHead className="text-foreground font-semibold">Amount</TableHead>
                  <TableHead className="text-foreground font-semibold">Channel</TableHead>
                  <TableHead className="text-foreground font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id} className="border-b border-border hover:bg-muted/50">
                    <TableCell className="text-foreground font-medium">{order.orderNumber}</TableCell>
                    <TableCell className="text-foreground">{order.customer}</TableCell>
                    <TableCell className="text-foreground">{order.phone}</TableCell>
                    <TableCell className="text-foreground">{formatCurrency(order.total)}</TableCell>
                    <TableCell className="text-foreground text-sm">{order.channel}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)} className="rounded-sm">
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No recent orders
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
