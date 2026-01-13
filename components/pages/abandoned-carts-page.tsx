"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ShoppingCart,
  Mail,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Percent,
  Clock,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts"

interface CartItem {
  productId: string
  name: string
  nameKh?: string
  quantity: number
  priceUsd: number
  priceKhr: number
  imageUrl?: string
}

interface AbandonedCart {
  id: string
  customerId: string | null
  guestId: string | null
  email: string | null
  cartItems: CartItem[]
  cartTotal: number
  currency: "USD" | "KHR"
  status: string
  lastActivityAt: string
  abandonedAt: string | null
  recoveredAt: string | null
  email1SentAt: string | null
  email2SentAt: string | null
  email3SentAt: string | null
  recoveryToken: string
  createdAt: string
}

interface Analytics {
  totalAbandoned: number
  totalRecovered: number
  recoveryRate: number
  totalAbandonedValue: number
  recoveredValue: number
  potentialRevenueLost: number
  emailFunnel: {
    email1Sent: number
    email2Sent: number
    email3Sent: number
    recovered: number
  }
  dailyTrend: Array<{
    date: string
    abandoned: number
    recovered: number
    value: number
  }>
  statusBreakdown: Array<{
    status: string
    count: number
    value: number
  }>
}

interface AbandonedCartsResponse {
  carts: AbandonedCart[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  analytics: Analytics
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  ABANDONED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  EMAIL_1_SENT: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  EMAIL_2_SENT: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  EMAIL_3_SENT: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  RECOVERED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  UNRECOVERABLE: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  ABANDONED: "Abandoned",
  EMAIL_1_SENT: "Email 1 Sent",
  EMAIL_2_SENT: "Email 2 Sent",
  EMAIL_3_SENT: "Email 3 Sent",
  RECOVERED: "Recovered",
  UNRECOVERABLE: "Unrecoverable",
}

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#f97316", "#ef4444", "#22c55e", "#6b7280"]

export function AbandonedCartsPage() {
  const { toast } = useToast()
  const [data, setData] = useState<AbandonedCartsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showSendEmailDialog, setShowSendEmailDialog] = useState(false)
  const [discountPercent, setDiscountPercent] = useState<string>("10")
  const [sending, setSending] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      })
      if (statusFilter !== "all") {
        params.set("status", statusFilter)
      }

      const response = await fetch(`/api/abandoned-carts?${params}`)
      if (!response.ok) throw new Error("Failed to fetch")
      const json = await response.json()
      setData(json)
    } catch {
      toast({
        title: "Error",
        description: "Failed to load abandoned carts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, statusFilter])

  const handleSendRecoveryEmail = async () => {
    if (!selectedCart) return
    setSending(true)
    try {
      const response = await fetch("/api/abandoned-carts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: selectedCart.id,
          action: "send_recovery_email",
          discountPercent: parseInt(discountPercent) || undefined,
        }),
      })
      if (!response.ok) throw new Error("Failed to send")
      toast({
        title: "Email Sent",
        description: "Recovery email sent successfully",
      })
      setShowSendEmailDialog(false)
      fetchData()
    } catch {
      toast({
        title: "Error",
        description: "Failed to send recovery email",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleMarkRecovered = async (cartId: string) => {
    try {
      const response = await fetch("/api/abandoned-carts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, action: "mark_recovered" }),
      })
      if (!response.ok) throw new Error("Failed")
      toast({ title: "Success", description: "Cart marked as recovered" })
      fetchData()
    } catch {
      toast({ title: "Error", description: "Failed to update cart", variant: "destructive" })
    }
  }

  const handleMarkUnrecoverable = async (cartId: string) => {
    try {
      const response = await fetch("/api/abandoned-carts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, action: "mark_unrecoverable" }),
      })
      if (!response.ok) throw new Error("Failed")
      toast({ title: "Success", description: "Cart marked as unrecoverable" })
      fetchData()
    } catch {
      toast({ title: "Error", description: "Failed to update cart", variant: "destructive" })
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value)
  }

  const analytics = data?.analytics

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Abandoned Cart Recovery</h1>
          <p className="text-muted-foreground">
            Track and recover abandoned shopping carts
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Analytics Overview */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recovery Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {analytics.recoveryRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {analytics.totalRecovered} of {analytics.totalAbandoned} carts recovered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue Recovered</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(analytics.recoveredValue)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Potential Revenue Lost</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(analytics.potentialRevenueLost)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Unrecovered cart value</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Abandoned</p>
                  <p className="text-2xl font-bold">{analytics.totalAbandoned}</p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                  <ShoppingCart className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {formatCurrency(analytics.totalAbandonedValue)} total value
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Cart List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="funnel">Email Funnel</TabsTrigger>
        </TabsList>

        {/* Cart List Tab */}
        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ABANDONED">Abandoned</SelectItem>
                <SelectItem value="EMAIL_1_SENT">Email 1 Sent</SelectItem>
                <SelectItem value="EMAIL_2_SENT">Email 2 Sent</SelectItem>
                <SelectItem value="EMAIL_3_SENT">Email 3 Sent</SelectItem>
                <SelectItem value="RECOVERED">Recovered</SelectItem>
                <SelectItem value="UNRECOVERABLE">Unrecoverable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Cart Value</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Abandoned</TableHead>
                    <TableHead>Emails Sent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : data?.carts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No abandoned carts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.carts.map((cart) => (
                      <TableRow key={cart.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate max-w-[180px]">
                              {cart.email || (cart.guestId ? `Guest ${cart.guestId.slice(-6)}` : "Unknown")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(cart.cartTotal)}
                        </TableCell>
                        <TableCell>{cart.cartItems.length} items</TableCell>
                        <TableCell>
                          <Badge className={statusColors[cart.status] || ""}>
                            {statusLabels[cart.status] || cart.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(cart.abandonedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {cart.email1SentAt && (
                              <Badge variant="outline" className="text-xs">1</Badge>
                            )}
                            {cart.email2SentAt && (
                              <Badge variant="outline" className="text-xs">2</Badge>
                            )}
                            {cart.email3SentAt && (
                              <Badge variant="outline" className="text-xs">3</Badge>
                            )}
                            {!cart.email1SentAt && (
                              <span className="text-muted-foreground text-xs">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCart(cart)
                                setShowDetailDialog(true)
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {cart.email && cart.status !== "RECOVERED" && cart.status !== "UNRECOVERABLE" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCart(cart)
                                  setShowSendEmailDialog(true)
                                }}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                            {cart.status !== "RECOVERED" && cart.status !== "UNRECOVERABLE" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkRecovered(cart.id)}
                                  title="Mark as recovered"
                                >
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkUnrecoverable(cart.id)}
                                  title="Mark as unrecoverable"
                                >
                                  <XCircle className="w-4 h-4 text-red-600" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.pagination.total)} of{" "}
                {data.pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Trend (Last 7 Days)</CardTitle>
                <CardDescription>Abandoned vs recovered carts</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analytics.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        }
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="abandoned"
                        stackId="1"
                        stroke="#f59e0b"
                        fill="#fef3c7"
                        name="Abandoned"
                      />
                      <Area
                        type="monotone"
                        dataKey="recovered"
                        stackId="2"
                        stroke="#22c55e"
                        fill="#dcfce7"
                        name="Recovered"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="h-[300px]" />
                )}
              </CardContent>
            </Card>

            {/* Status Breakdown Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Current cart status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.statusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${statusLabels[entry.status] || entry.status}: ${entry.count}`}
                        labelLine={false}
                      >
                        {analytics.statusBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, statusLabels[name as string] || name]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="h-[300px]" />
                )}
              </CardContent>
            </Card>

            {/* Value by Status */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Cart Value by Status</CardTitle>
                <CardDescription>Total cart value in each status</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.statusBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" tickFormatter={(v) => statusLabels[v] || v} />
                      <YAxis tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value) => [formatCurrency(value as number), "Value"]}
                        labelFormatter={(label) => statusLabels[label] || label}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {analytics.statusBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.status === "RECOVERED" ? "#22c55e" : entry.status === "UNRECOVERABLE" ? "#6b7280" : "#f59e0b"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="h-[300px]" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Funnel Tab */}
        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Recovery Funnel</CardTitle>
              <CardDescription>
                Conversion through the 3-email recovery sequence (last 30 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <div className="space-y-6">
                  {/* Funnel Visualization */}
                  <div className="flex flex-col items-center gap-2">
                    {/* Abandoned */}
                    <div className="w-full max-w-md">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Abandoned Carts</span>
                        <span className="font-bold">{analytics.totalAbandoned}</span>
                      </div>
                      <div className="h-12 bg-yellow-500 rounded-lg flex items-center justify-center text-white font-bold">
                        100%
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-muted-foreground">
                      <Mail className="w-5 h-5" />
                    </div>

                    {/* Email 1 */}
                    <div className="w-full max-w-md" style={{ maxWidth: "85%" }}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Email 1 Sent (1 hour)</span>
                        <span className="font-bold">{analytics.emailFunnel.email1Sent}</span>
                      </div>
                      <div className="h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {analytics.totalAbandoned > 0
                          ? Math.round((analytics.emailFunnel.email1Sent / analytics.totalAbandoned) * 100)
                          : 0}%
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">24 hours</span>
                    </div>

                    {/* Email 2 */}
                    <div className="w-full max-w-md" style={{ maxWidth: "70%" }}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Email 2 Sent (+5% discount)</span>
                        <span className="font-bold">{analytics.emailFunnel.email2Sent}</span>
                      </div>
                      <div className="h-12 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {analytics.totalAbandoned > 0
                          ? Math.round((analytics.emailFunnel.email2Sent / analytics.totalAbandoned) * 100)
                          : 0}%
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">48 hours</span>
                    </div>

                    {/* Email 3 */}
                    <div className="w-full max-w-md" style={{ maxWidth: "55%" }}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Email 3 Sent (+10% discount)</span>
                        <span className="font-bold">{analytics.emailFunnel.email3Sent}</span>
                      </div>
                      <div className="h-12 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {analytics.totalAbandoned > 0
                          ? Math.round((analytics.emailFunnel.email3Sent / analytics.totalAbandoned) * 100)
                          : 0}%
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-green-600">
                      <CheckCircle className="w-5 h-5" />
                    </div>

                    {/* Recovered */}
                    <div className="w-full max-w-md" style={{ maxWidth: "40%" }}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Recovered</span>
                        <span className="font-bold text-green-600">
                          {analytics.emailFunnel.recovered}
                        </span>
                      </div>
                      <div className="h-12 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {analytics.recoveryRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(analytics.recoveredValue)}
                      </p>
                      <p className="text-sm text-muted-foreground">Revenue Recovered</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-yellow-600">
                        {analytics.recoveryRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Recovery Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-600">
                        {formatCurrency(analytics.potentialRevenueLost)}
                      </p>
                      <p className="text-sm text-muted-foreground">Potential Lost</p>
                    </div>
                  </div>
                </div>
              ) : (
                <Skeleton className="h-[400px]" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cart Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cart Details</DialogTitle>
            <DialogDescription>
              {selectedCart?.email || "Guest Cart"}
            </DialogDescription>
          </DialogHeader>
          {selectedCart && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusColors[selectedCart.status] || ""}>
                    {statusLabels[selectedCart.status] || selectedCart.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cart Total</p>
                  <p className="font-bold">{formatCurrency(selectedCart.cartTotal)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Abandoned At</p>
                  <p>{formatDate(selectedCart.abandonedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p>{formatDate(selectedCart.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Cart Items</p>
                <div className="border rounded-lg divide-y">
                  {selectedCart.cartItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} x {formatCurrency(item.priceUsd)}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatCurrency(item.quantity * item.priceUsd)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Email History</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedCart.email1SentAt ? "default" : "outline"}>1</Badge>
                    <span className="text-sm">
                      {selectedCart.email1SentAt ? formatDate(selectedCart.email1SentAt) : "Not sent"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedCart.email2SentAt ? "default" : "outline"}>2</Badge>
                    <span className="text-sm">
                      {selectedCart.email2SentAt ? formatDate(selectedCart.email2SentAt) : "Not sent"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedCart.email3SentAt ? "default" : "outline"}>3</Badge>
                    <span className="text-sm">
                      {selectedCart.email3SentAt ? formatDate(selectedCart.email3SentAt) : "Not sent"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Recovery Email Dialog */}
      <Dialog open={showSendEmailDialog} onOpenChange={setShowSendEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Recovery Email</DialogTitle>
            <DialogDescription>
              Send a recovery email to {selectedCart?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="discount">Include Discount (%)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Percent className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="discount"
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="e.g., 10"
                  min="0"
                  max="50"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty or 0 for no discount. A unique coupon code will be generated.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendRecoveryEmail} disabled={sending}>
              {sending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
