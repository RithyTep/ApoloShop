"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const kpiData = [
  { label: "Today Orders", value: "24", change: "+12% from yesterday" },
  { label: "Revenue", value: "$1,240 / ៛5,890,000", change: "+8% from yesterday" },
  { label: "Pending Orders", value: "8", change: "Need action" },
  { label: "Low Stock Items", value: "3", change: "Urgent" },
]

const chartData = [
  { day: "Mon", orders: 4 },
  { day: "Tue", orders: 6 },
  { day: "Wed", orders: 5 },
  { day: "Thu", orders: 8 },
  { day: "Fri", orders: 10 },
  { day: "Sat", orders: 12 },
  { day: "Sun", orders: 9 },
]

const recentOrders = [
  { id: "#001", customer: "Sophea", phone: "010 123 456", amount: "$45.50", currency: "USD", status: "Confirmed" },
  { id: "#002", customer: "Dara", phone: "010 234 567", amount: "៛215,000", currency: "KHR", status: "Preparing" },
  { id: "#003", customer: "Nary", phone: "010 345 678", amount: "$32.00", currency: "USD", status: "New" },
  { id: "#004", customer: "Sokha", phone: "010 456 789", amount: "៛145,000", currency: "KHR", status: "Completed" },
  { id: "#005", customer: "Pich", phone: "010 567 890", amount: "$78.25", currency: "USD", status: "Confirmed" },
]

export function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back to your shop admin panel</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">{kpi.label}</h3>
            <p className="text-2xl font-bold text-foreground mt-2">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-2">{kpi.change}</p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Orders by Day</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip />
              <Bar dataKey="orders" fill="var(--color-primary)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="var(--color-primary)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="text-foreground font-semibold">Order ID</TableHead>
                <TableHead className="text-foreground font-semibold">Customer</TableHead>
                <TableHead className="text-foreground font-semibold">Phone</TableHead>
                <TableHead className="text-foreground font-semibold">Amount</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.id} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="text-foreground font-medium">{order.id}</TableCell>
                  <TableCell className="text-foreground">{order.customer}</TableCell>
                  <TableCell className="text-foreground">{order.phone}</TableCell>
                  <TableCell className="text-foreground">{order.amount}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.status === "Completed"
                          ? "default"
                          : order.status === "Cancelled"
                            ? "destructive"
                            : "secondary"
                      }
                      className="rounded-sm"
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
