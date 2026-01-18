"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download } from "lucide-react"
import { useOrders, useUpdateOrderStatus, Order, OrderStatus, OrderChannel } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import {
  AdminPageHeader,
  AdminFilterCardGrid,
  AdminDataCard,
  AdminTable,
  AdminTableHeader,
  AdminTableHeadRow,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminActionButtons,
  AdminViewButton,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"

const statusOptions: OrderStatus[] = ["NEW", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]
const channelOptions: OrderChannel[] = ["WEBSITE", "TELEGRAM", "MESSENGER", "PHONE", "WALK_IN"]

const statusTransitions: Record<string, OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
}

export function OrdersPage() {
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("")
  const [channelFilter, setChannelFilter] = useState<OrderChannel | "">("")
  const [search, setSearch] = useState("")
  const [viewOrder, setViewOrder] = useState<Order | null>(null)

  const { data, isLoading } = useOrders(statusFilter ? { status: statusFilter } : undefined)
  const updateStatus = useUpdateOrderStatus()

  const allOrders = data?.orders || []

  // Client-side filtering for search and channel
  const orders = allOrders.filter((o) => {
    const matchesSearch = !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.phone?.includes(search)
    const matchesChannel = !channelFilter || o.channel === channelFilter
    return matchesSearch && matchesChannel
  })

  const handleStatusChange = async (orderId: string, currentStatus: string, newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status: newStatus })
      toast({ title: `Order updated to ${newStatus}` })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED": return "default"
      case "CANCELLED": return "destructive"
      case "NEW": return "secondary"
      case "READY": return "outline"
      default: return "secondary"
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "KHR") return `៛${amount.toLocaleString()}`
    return `$${Number(amount).toFixed(2)}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <AdminLoading
        title="Orders"
        subtitle="Manage and track all customer orders"
        rows={5}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Orders"
        subtitle="Manage and track all customer orders"
      >
        <Button>
          <Download size={16} className="mr-2" /> Export to Excel
        </Button>
      </AdminPageHeader>

      <AdminFilterCardGrid columns={4}>
        <Input
          placeholder="Search by order ID or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v as OrderStatus)}>
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channelFilter || "all"} onValueChange={(v) => setChannelFilter(v === "all" ? "" : v as OrderChannel)}>
          <SelectTrigger>
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {channelOptions.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground flex items-center">
          {orders.length} orders found
        </div>
      </AdminFilterCardGrid>

      <AdminDataCard>
        {orders.length > 0 ? (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeadRow>
                <AdminTableHead>Order ID</AdminTableHead>
                <AdminTableHead>Customer</AdminTableHead>
                <AdminTableHead>Phone</AdminTableHead>
                <AdminTableHead>Amount</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Channel</AdminTableHead>
                <AdminTableHead>Date</AdminTableHead>
                <AdminTableHead>Action</AdminTableHead>
              </AdminTableHeadRow>
            </AdminTableHeader>
            <AdminTableBody>
              {orders.map((order) => {
                const nextStatuses = statusTransitions[order.status] || []
                return (
                  <AdminTableRow key={order.id}>
                    <AdminTableCell className="font-medium">{order.orderNumber}</AdminTableCell>
                    <AdminTableCell>{order.customer?.name || "Unknown"}</AdminTableCell>
                    <AdminTableCell>{order.customer?.phone || "-"}</AdminTableCell>
                    <AdminTableCell>
                      {formatCurrency(order.currency === "KHR" ? order.totalKhr : order.totalUsd, order.currency)}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex items-center gap-2">
                        <AdminBadge variant={getStatusBadgeVariant(order.status)}>
                          {order.status}
                        </AdminBadge>
                        {nextStatuses.length > 0 && (
                          <Select onValueChange={(v) => handleStatusChange(order.id, order.status, v as OrderStatus)}>
                            <SelectTrigger className="h-6 w-16 text-xs">
                              <SelectValue placeholder="→" />
                            </SelectTrigger>
                            <SelectContent>
                              {nextStatuses.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className="text-sm">{order.channel}</AdminTableCell>
                    <AdminTableCell className="text-sm">{formatDate(order.createdAt)}</AdminTableCell>
                    <AdminTableCell>
                      <AdminActionButtons>
                        <AdminViewButton onClick={() => setViewOrder(order)} />
                      </AdminActionButtons>
                    </AdminTableCell>
                  </AdminTableRow>
                )
              })}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <AdminEmptyState message="No orders found" />
        )}
      </AdminDataCard>

      {/* Order Detail Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Order Details - {viewOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <p className="font-medium">{viewOrder.customer?.name}</p>
                  <p>{viewOrder.customer?.phone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>
                    <Badge variant={getStatusBadgeVariant(viewOrder.status)}>{viewOrder.status}</Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Channel:</span>
                  <p>{viewOrder.channel}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p>{formatDate(viewOrder.createdAt)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Items</h4>
                <div className="space-y-2">
                  {viewOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.product?.nameEn || "Product"} x{item.quantity}</span>
                      <span>{formatCurrency(item.priceUsd * item.quantity, "USD")}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(viewOrder.totalUsd, "USD")}</span>
                </div>
              </div>

              {viewOrder.note && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-1">Note</h4>
                  <p className="text-sm text-muted-foreground">{viewOrder.note}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
