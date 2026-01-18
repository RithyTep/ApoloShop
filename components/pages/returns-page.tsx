"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Check, X, Package, CreditCard, DollarSign } from "lucide-react"
import {
  AdminPageHeader,
  AdminFilterCard,
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
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"

type ReturnStatus = "PENDING" | "APPROVED" | "RECEIVED" | "REFUNDED" | "REJECTED" | "CANCELLED"
type RefundMethod = "ORIGINAL_PAYMENT" | "STORE_CREDIT" | "BANK_TRANSFER"

interface ReturnItem {
  orderItemId: string
  productId: string
  productName: string
  quantity: number
  priceUsd: number
}

interface Return {
  id: string
  returnNumber: string
  orderId: string
  customerId: string
  status: ReturnStatus
  reason: string
  reasonDetails?: string
  items: ReturnItem[]
  refundAmountUsd?: number
  refundAmountKhr?: number
  refundMethod?: RefundMethod
  trackingNumber?: string
  adminNotes?: string
  approvedAt?: string
  receivedAt?: string
  refundedAt?: string
  rejectedAt?: string
  rejectionReason?: string
  createdAt: string
  order?: {
    orderNumber: string
    totalUsd: number
  }
  customer?: {
    name: string
    phone: string
    email?: string
  }
}

const STATUS_FILTERS: { value: ReturnStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Returns" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "RECEIVED", label: "Received" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
]

const REASON_LABELS: Record<string, string> = {
  DEFECTIVE: "Defective/Damaged",
  WRONG_ITEM: "Wrong Item",
  NOT_AS_DESCRIBED: "Not as Described",
  CHANGED_MIND: "Changed Mind",
  SIZE_FIT: "Size/Fit Issue",
  QUALITY: "Quality Issue",
  LATE_DELIVERY: "Late Delivery",
  OTHER: "Other",
}

const REFUND_METHODS: { value: RefundMethod; label: string }[] = [
  { value: "ORIGINAL_PAYMENT", label: "Original Payment Method" },
  { value: "STORE_CREDIT", label: "Store Credit" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
]

export function ReturnsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | "ALL">("ALL")
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [actionDialog, setActionDialog] = useState<"approve" | "reject" | "refund" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [adminNotes, setAdminNotes] = useState("")
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("ORIGINAL_PAYMENT")
  const [refundAmount, setRefundAmount] = useState("")
  const [page, setPage] = useState(1)
  const limit = 20

  // Fetch returns
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-returns", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      params.set("page", page.toString())
      params.set("limit", limit.toString())
      const res = await fetch(`/api/returns?${params}`)
      if (!res.ok) throw new Error("Failed to fetch returns")
      return res.json() as Promise<{ returns: Return[]; pagination: { total: number; totalPages: number } }>
    },
  })

  // Update return status mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<Return>
    }) => {
      const res = await fetch(`/api/returns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update return")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-returns"] })
      refetch()
    },
  })

  // Process refund mutation
  const refundMutation = useMutation({
    mutationFn: async ({
      id,
      refundMethod,
      refundAmountUsd,
      adminNotes,
    }: {
      id: string
      refundMethod: RefundMethod
      refundAmountUsd?: number
      adminNotes?: string
    }) => {
      const res = await fetch(`/api/returns/${id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundMethod, refundAmountUsd, adminNotes }),
      })
      if (!res.ok) throw new Error("Failed to process refund")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-returns"] })
      refetch()
    },
  })

  const returns = data?.returns || []
  const pagination = data?.pagination
  const pendingCount = returns.filter((r) => r.status === "PENDING").length

  const handleApprove = async () => {
    if (!selectedReturn) return
    try {
      await updateMutation.mutateAsync({
        id: selectedReturn.id,
        data: { status: "APPROVED", adminNotes: adminNotes || undefined },
      })
      toast({ title: "Return Approved", description: "Return request has been approved" })
      closeActionDialog()
    } catch {
      toast({ title: "Error", description: "Failed to approve return", variant: "destructive" })
    }
  }

  const handleReject = async () => {
    if (!selectedReturn || !rejectionReason) return
    try {
      await updateMutation.mutateAsync({
        id: selectedReturn.id,
        data: {
          status: "REJECTED",
          rejectionReason,
          adminNotes: adminNotes || undefined,
        },
      })
      toast({ title: "Return Rejected", description: "Return request has been rejected" })
      closeActionDialog()
    } catch {
      toast({ title: "Error", description: "Failed to reject return", variant: "destructive" })
    }
  }

  const handleMarkReceived = async (returnItem: Return) => {
    try {
      await updateMutation.mutateAsync({
        id: returnItem.id,
        data: { status: "RECEIVED" },
      })
      toast({ title: "Marked Received", description: "Return marked as received" })
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
    }
  }

  const handleProcessRefund = async () => {
    if (!selectedReturn) return
    try {
      await refundMutation.mutateAsync({
        id: selectedReturn.id,
        refundMethod,
        refundAmountUsd: refundAmount ? parseFloat(refundAmount) : undefined,
        adminNotes: adminNotes || undefined,
      })
      toast({ title: "Refund Processed", description: "Refund has been processed successfully" })
      closeActionDialog()
    } catch {
      toast({ title: "Error", description: "Failed to process refund", variant: "destructive" })
    }
  }

  const closeActionDialog = () => {
    setActionDialog(null)
    setSelectedReturn(null)
    setRejectionReason("")
    setAdminNotes("")
    setRefundAmount("")
    setRefundMethod("ORIGINAL_PAYMENT")
  }

  const getStatusBadge = (status: ReturnStatus) => {
    const variants: Record<ReturnStatus, { variant: "default" | "outline" | "destructive" | "secondary"; label: string }> = {
      PENDING: { variant: "outline", label: "Pending" },
      APPROVED: { variant: "default", label: "Approved" },
      RECEIVED: { variant: "default", label: "Received" },
      REFUNDED: { variant: "default", label: "Refunded" },
      REJECTED: { variant: "destructive", label: "Rejected" },
      CANCELLED: { variant: "secondary", label: "Cancelled" },
    }
    const v = variants[status]
    return (
      <AdminBadge variant={v.variant}>
        {v.label}
      </AdminBadge>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (isLoading) {
    return (
      <AdminLoading
        title="Returns"
        subtitle="Manage customer return requests and process refunds"
        rows={5}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Returns"
        subtitle="Manage customer return requests and process refunds"
      />

      <AdminFilterCard>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ReturnStatus | "ALL")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {pagination?.total || 0} returns
          {pendingCount > 0 && ` (${pendingCount} pending)`}
        </div>
      </AdminFilterCard>

      <AdminDataCard>
        {returns.length === 0 ? (
          <AdminEmptyState message="No return requests found" />
        ) : (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeadRow>
                <AdminTableHead>Return #</AdminTableHead>
                <AdminTableHead>Order</AdminTableHead>
                <AdminTableHead>Customer</AdminTableHead>
                <AdminTableHead>Reason</AdminTableHead>
                <AdminTableHead>Amount</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Date</AdminTableHead>
                <AdminTableHead>Actions</AdminTableHead>
              </AdminTableHeadRow>
            </AdminTableHeader>
            <AdminTableBody>
              {returns.map((ret) => (
                <AdminTableRow key={ret.id}>
                  <AdminTableCell className="font-medium">{ret.returnNumber}</AdminTableCell>
                  <AdminTableCell>{ret.order?.orderNumber || ret.orderId.slice(0, 8)}</AdminTableCell>
                  <AdminTableCell>
                    <div>
                      <div className="font-medium">{ret.customer?.name || "Unknown"}</div>
                      <div className="text-sm text-muted-foreground">
                        {ret.customer?.phone}
                      </div>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <span className="text-sm">{REASON_LABELS[ret.reason] || ret.reason}</span>
                  </AdminTableCell>
                  <AdminTableCell>
                    ${Number(ret.refundAmountUsd || 0).toFixed(2)}
                  </AdminTableCell>
                  <AdminTableCell>{getStatusBadge(ret.status)}</AdminTableCell>
                  <AdminTableCell>{formatDate(ret.createdAt)}</AdminTableCell>
                  <AdminTableCell>
                    <AdminActionButtons>
                      <AdminViewButton
                        onClick={() => {
                          setSelectedReturn(ret)
                          setAdminNotes(ret.adminNotes || "")
                        }}
                      />
                      {ret.status === "PENDING" && (
                        <>
                          <AdminActionButton
                            icon={<Check size={14} />}
                            onClick={() => {
                              setSelectedReturn(ret)
                              setActionDialog("approve")
                            }}
                          />
                          <AdminActionButton
                            icon={<X size={14} />}
                            onClick={() => {
                              setSelectedReturn(ret)
                              setActionDialog("reject")
                            }}
                            variant="destructive"
                          />
                        </>
                      )}
                      {ret.status === "APPROVED" && (
                        <AdminActionButton
                          icon={<Package size={14} />}
                          onClick={() => handleMarkReceived(ret)}
                        />
                      )}
                      {ret.status === "RECEIVED" && (
                        <AdminActionButton
                          icon={<CreditCard size={14} />}
                          onClick={() => {
                            setSelectedReturn(ret)
                            setRefundAmount(ret.refundAmountUsd?.toString() || "")
                            setActionDialog("refund")
                          }}
                        />
                      )}
                    </AdminActionButtons>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminDataCard>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="py-2 px-4 text-sm">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* View Return Details Dialog */}
      {selectedReturn && !actionDialog && (
        <Dialog open={true} onOpenChange={() => setSelectedReturn(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Return {selectedReturn.returnNumber}
              </DialogTitle>
              <DialogDescription>
                {getStatusBadge(selectedReturn.status)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Order</Label>
                  <p className="font-medium">
                    {selectedReturn.order?.orderNumber || selectedReturn.orderId}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedReturn.customer?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReturn.customer?.phone}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <p className="font-medium">
                    {REASON_LABELS[selectedReturn.reason] || selectedReturn.reason}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Refund Amount</Label>
                  <p className="font-medium text-lg">
                    ${Number(selectedReturn.refundAmountUsd || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              {selectedReturn.reasonDetails && (
                <div>
                  <Label className="text-muted-foreground">Additional Details</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg">
                    {selectedReturn.reasonDetails}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Items</Label>
                <div className="mt-2 space-y-2">
                  {(selectedReturn.items as ReturnItem[]).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-muted rounded-lg"
                    >
                      <span>{item.productName}</span>
                      <span className="text-muted-foreground">
                        {item.quantity} x ${item.priceUsd.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedReturn.adminNotes && (
                <div>
                  <Label className="text-muted-foreground">Admin Notes</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg">
                    {selectedReturn.adminNotes}
                  </p>
                </div>
              )}
              {selectedReturn.rejectionReason && (
                <div>
                  <Label className="text-destructive">
                    Rejection Reason
                  </Label>
                  <p className="mt-1 p-3 bg-destructive/10 text-destructive rounded-lg">
                    {selectedReturn.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Approve Dialog */}
      <Dialog open={actionDialog === "approve"} onOpenChange={closeActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              Approve Return
            </DialogTitle>
            <DialogDescription>
              Approve this return request. Customer will be notified to ship the item back.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Admin Notes (optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any internal notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog}>
              Cancel
            </Button>
            <Button
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={handleApprove}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Processing..." : "Approve Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionDialog === "reject"} onOpenChange={closeActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <X className="h-5 w-5" />
              Reject Return
            </DialogTitle>
            <DialogDescription>
              Reject this return request. Customer will be notified with the reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this return is being rejected..."
                required
              />
            </div>
            <div>
              <Label>Admin Notes (optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any internal notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Processing..." : "Reject Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Refund Dialog */}
      <Dialog open={actionDialog === "refund"} onOpenChange={closeActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <DollarSign className="h-5 w-5" />
              Process Refund
            </DialogTitle>
            <DialogDescription>
              Process the refund for this return. Select the refund method below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Refund Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label>Refund Method</Label>
              <Select
                value={refundMethod}
                onValueChange={(v) => setRefundMethod(v as RefundMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Admin Notes (optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this refund..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog}>
              Cancel
            </Button>
            <Button
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={handleProcessRefund}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending ? "Processing..." : "Process Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
