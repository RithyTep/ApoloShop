"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, BellOff, Package, Mail, Clock, CheckCircle } from "lucide-react"
import Image from "next/image"

interface StockNotification {
  id: string
  email: string
  productId: string
  notified: boolean
  notifiedAt: string | null
  createdAt: string
  product: {
    id: string
    nameEn: string
    nameKh: string
    imageUrl: string | null
    sku: string
  }
}

interface StockNotificationsData {
  notifications: StockNotification[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: {
    pending: number
    notified: number
    total: number
  }
}

const statusFilters: { value: string; label: string }[] = [
  { value: "all", label: "All Requests" },
  { value: "pending", label: "Pending" },
  { value: "notified", label: "Notified" },
]

export function StockNotificationsPage() {
  const [data, setData] = useState<StockNotificationsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const limit = 20

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        admin: "true",
        page: page.toString(),
        limit: limit.toString(),
        ...(statusFilter !== "all" && { status: statusFilter }),
      })
      const response = await fetch(`/api/stock-notifications?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error("Failed to fetch stock notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  const notifications = data?.notifications || []
  const summary = data?.summary || { pending: 0, notified: 0, total: 0 }
  const pagination = data?.pagination

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Bell className="h-7 w-7" />
            Stock Notification Requests
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            Manage customer back-in-stock notifications
            {summary.pending > 0 && (
              <Badge variant="warning" className="ml-2">
                {summary.pending} Pending
              </Badge>
            )}
          </p>
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusFilters.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{summary.pending}</div>
            <p className="text-xs text-muted-foreground">Waiting for restock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notified</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{summary.notified}</div>
            <p className="text-xs text-muted-foreground">Email sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Table */}
      <Card className="p-6">
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notification requests found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Notified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded bg-muted overflow-hidden flex-shrink-0">
                          {notification.product.imageUrl ? (
                            <Image
                              src={notification.product.imageUrl}
                              alt={notification.product.nameEn}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground line-clamp-1">
                            {notification.product.nameEn}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {notification.product.sku}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{notification.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {notification.notified ? (
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Notified
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(notification.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {notification.notifiedAt ? formatDate(notification.notifiedAt) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} requests
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
