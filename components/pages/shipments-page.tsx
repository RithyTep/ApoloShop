"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  X,
  Eye,
  Search,
  AlertCircle,
  ArrowRight,
  PackageCheck,
  PackageX,
  SplitSquareVertical,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"

// Types
type ShipmentStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED"
type ShipmentType = "STANDARD" | "SPLIT" | "PARTIAL"
type CourierProvider = "JT_EXPRESS" | "NINJA_VAN" | "WING_DELIVERY" | "OTHER"

interface ShipmentItem {
  id: string
  productName: string
  productSku?: string
  quantity: number
  availabilityStatus?: string
  expectedAvailableDate?: string
}

interface Shipment {
  id: string
  shipmentNumber: string
  orderId: string
  type: ShipmentType
  status: ShipmentStatus
  trackingNumber?: string
  courier: CourierProvider
  courierName?: string
  estimatedShipDate?: string
  actualShipDate?: string
  estimatedDeliveryDate?: string
  actualDeliveryDate?: string
  shippingChargeUsd?: number
  shippingChargeKhr?: number
  customerConsent: boolean
  notes?: string
  createdAt: string
  items: ShipmentItem[]
  order: {
    id: string
    orderNumber: string
    customer: {
      name: string
      phone: string
    }
  }
  statusHistory?: {
    id: string
    status: ShipmentStatus
    location?: string
    notes?: string
    createdAt: string
  }[]
}

// API hooks
function useShipments(status?: ShipmentStatus[], type?: ShipmentType, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["shipments", status, type, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (status && status.length > 0) params.append("status", status.join(","))
      if (type) params.append("type", type)
      params.append("page", String(page))
      params.append("limit", String(limit))

      const response = await fetch(`/api/shipments?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch shipments")
      return response.json()
    },
  })
}

function useShipmentDetails(id: string | null) {
  return useQuery({
    queryKey: ["shipment", id],
    queryFn: async () => {
      if (!id) return null
      const response = await fetch(`/api/shipments?id=${id}`)
      if (!response.ok) throw new Error("Failed to fetch shipment")
      return response.json()
    },
    enabled: !!id,
  })
}

function useUpdateShipmentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status: ShipmentStatus; trackingNumber?: string; courier?: CourierProvider; notes?: string; notifyCustomer?: boolean }) => {
      const response = await fetch(`/api/shipments?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to update shipment")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] })
    },
  })
}

function useCancelShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const params = new URLSearchParams()
      params.append("id", id)
      if (reason) params.append("reason", reason)

      const response = await fetch(`/api/shipments?${params.toString()}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to cancel shipment")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] })
    },
  })
}

// Constants
const statusOptions: { value: ShipmentStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
]

const courierOptions: { value: CourierProvider; label: string }[] = [
  { value: "JT_EXPRESS", label: "J&T Express" },
  { value: "NINJA_VAN", label: "Ninja Van" },
  { value: "WING_DELIVERY", label: "Wing Delivery" },
  { value: "OTHER", label: "Other" },
]

const statusIcons: Record<ShipmentStatus, typeof Package> = {
  PENDING: Clock,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: X,
}

const statusColors: Record<ShipmentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

const typeColors: Record<ShipmentType, string> = {
  STANDARD: "bg-gray-100 text-gray-800",
  SPLIT: "bg-indigo-100 text-indigo-800",
  PARTIAL: "bg-orange-100 text-orange-800",
}

export function ShipmentsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"pending" | "processing" | "shipped" | "all">("pending")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  // Form state for updates
  const [updateForm, setUpdateForm] = useState({
    status: "PROCESSING" as ShipmentStatus,
    trackingNumber: "",
    courier: "JT_EXPRESS" as CourierProvider,
    notes: "",
    notifyCustomer: true,
  })
  const [cancelReason, setCancelReason] = useState("")

  // Get status filter based on active tab
  const getStatusFilter = (): ShipmentStatus[] | undefined => {
    switch (activeTab) {
      case "pending": return ["PENDING"]
      case "processing": return ["PROCESSING"]
      case "shipped": return ["SHIPPED"]
      case "all": return undefined
    }
  }

  const { data: shipmentsData, isLoading } = useShipments(getStatusFilter())
  const { data: shipmentDetails } = useShipmentDetails(selectedShipmentId)
  const updateStatus = useUpdateShipmentStatus()
  const cancelShipment = useCancelShipment()

  const shipments: Shipment[] = shipmentsData?.shipments || []

  // Filter by search
  const filteredShipments = shipments.filter(shipment => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      shipment.shipmentNumber.toLowerCase().includes(query) ||
      shipment.order.orderNumber.toLowerCase().includes(query) ||
      shipment.order.customer.name.toLowerCase().includes(query) ||
      shipment.trackingNumber?.toLowerCase().includes(query)
    )
  })

  const handleViewDetails = (shipment: Shipment) => {
    setSelectedShipmentId(shipment.id)
  }

  const handleUpdateStatus = (shipment: Shipment) => {
    setSelectedShipmentId(shipment.id)
    setUpdateForm({
      status: shipment.status === "PENDING" ? "PROCESSING" : shipment.status === "PROCESSING" ? "SHIPPED" : shipment.status,
      trackingNumber: shipment.trackingNumber || "",
      courier: shipment.courier,
      notes: "",
      notifyCustomer: true,
    })
    setShowUpdateDialog(true)
  }

  const handleCancelShipment = (shipment: Shipment) => {
    setSelectedShipmentId(shipment.id)
    setCancelReason("")
    setShowCancelDialog(true)
  }

  const submitStatusUpdate = async () => {
    if (!selectedShipmentId) return

    try {
      await updateStatus.mutateAsync({
        id: selectedShipmentId,
        ...updateForm,
      })
      toast({ title: "Shipment updated", description: "Shipment status has been updated successfully" })
      setShowUpdateDialog(false)
      setSelectedShipmentId(null)
    } catch {
      toast({ title: "Error", description: "Failed to update shipment", variant: "destructive" })
    }
  }

  const submitCancel = async () => {
    if (!selectedShipmentId) return

    try {
      await cancelShipment.mutateAsync({
        id: selectedShipmentId,
        reason: cancelReason,
      })
      toast({ title: "Shipment cancelled", description: "Shipment has been cancelled successfully" })
      setShowCancelDialog(false)
      setSelectedShipmentId(null)
    } catch {
      toast({ title: "Error", description: "Failed to cancel shipment", variant: "destructive" })
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shipment Fulfillment</h1>
          <p className="text-sm text-muted-foreground">
            Manage order shipments and split deliveries
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="processing" className="gap-2">
              <Package className="h-4 w-4" />
              Processing
            </TabsTrigger>
            <TabsTrigger value="shipped" className="gap-2">
              <Truck className="h-4 w-4" />
              Shipped
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shipments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredShipments.length === 0 ? (
              <div className="p-12 text-center">
                <PackageCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No shipments found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Try adjusting your search query" : "No shipments in this status"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Est. Ship Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShipments.map((shipment) => {
                    const StatusIcon = statusIcons[shipment.status]
                    return (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {shipment.type === "SPLIT" && (
                              <SplitSquareVertical className="h-4 w-4 text-indigo-500" />
                            )}
                            {shipment.shipmentNumber}
                          </div>
                          {shipment.trackingNumber && (
                            <span className="text-xs text-muted-foreground">
                              {shipment.trackingNumber}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{shipment.order.orderNumber}</TableCell>
                        <TableCell>
                          <div>{shipment.order.customer.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {shipment.order.customer.phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={typeColors[shipment.type]}>
                            {shipment.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {shipment.items.length} item(s)
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {shipment.items.slice(0, 2).map(i => i.productName).join(", ")}
                            {shipment.items.length > 2 && ` +${shipment.items.length - 2} more`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[shipment.status]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {shipment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(shipment.estimatedShipDate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetails(shipment)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {shipment.status !== "DELIVERED" && shipment.status !== "CANCELLED" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleUpdateStatus(shipment)}
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCancelShipment(shipment)}
                                >
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={!!selectedShipmentId && !showUpdateDialog && !showCancelDialog} onOpenChange={(open) => !open && setSelectedShipmentId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Shipment Details
            </DialogTitle>
          </DialogHeader>

          {shipmentDetails?.shipment && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Shipment Number</Label>
                  <p className="font-medium">{shipmentDetails.shipment.shipmentNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Order</Label>
                  <p className="font-medium">{shipmentDetails.shipment.order.orderNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={statusColors[shipmentDetails.shipment.status as ShipmentStatus]}>
                    {shipmentDetails.shipment.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <Badge className={typeColors[shipmentDetails.shipment.type as ShipmentType]}>
                    {shipmentDetails.shipment.type}
                  </Badge>
                </div>
                {shipmentDetails.shipment.trackingNumber && (
                  <div>
                    <Label className="text-muted-foreground">Tracking Number</Label>
                    <p className="font-medium">{shipmentDetails.shipment.trackingNumber}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Courier</Label>
                  <p className="font-medium">
                    {courierOptions.find(c => c.value === shipmentDetails.shipment.courier)?.label || shipmentDetails.shipment.courierName}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div>
                <Label className="text-muted-foreground mb-2 block">Items</Label>
                <div className="border rounded-lg divide-y">
                  {shipmentDetails.shipment.items.map((item: ShipmentItem) => (
                    <div key={item.id} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        {item.productSku && (
                          <p className="text-xs text-muted-foreground">SKU: {item.productSku}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">x{item.quantity}</p>
                        {item.availabilityStatus && (
                          <Badge variant="outline" className="text-xs">
                            {item.availabilityStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History */}
              {shipmentDetails.shipment.statusHistory && shipmentDetails.shipment.statusHistory.length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Status History</Label>
                  <div className="space-y-2">
                    {shipmentDetails.shipment.statusHistory.map((history: { id: string; status: ShipmentStatus; location?: string; notes?: string; createdAt: string }) => (
                      <div key={history.id} className="flex items-start gap-3 text-sm">
                        <div className={`mt-0.5 h-2 w-2 rounded-full ${statusColors[history.status].split(" ")[0]}`} />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium">{history.status}</span>
                            <span className="text-muted-foreground text-xs">
                              {new Date(history.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {history.location && (
                            <p className="text-muted-foreground">{history.location}</p>
                          )}
                          {history.notes && (
                            <p className="text-muted-foreground">{history.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Shipment Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select
                value={updateForm.status}
                onValueChange={(v) => setUpdateForm(prev => ({ ...prev, status: v as ShipmentStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions
                    .filter(s => s.value !== "CANCELLED")
                    .map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {updateForm.status === "SHIPPED" && (
              <>
                <div>
                  <Label>Tracking Number</Label>
                  <Input
                    value={updateForm.trackingNumber}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                    placeholder="Enter tracking number"
                  />
                </div>

                <div>
                  <Label>Courier</Label>
                  <Select
                    value={updateForm.courier}
                    onValueChange={(v) => setUpdateForm(prev => ({ ...prev, courier: v as CourierProvider }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {courierOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                value={updateForm.notes}
                onChange={(e) => setUpdateForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="notify"
                checked={updateForm.notifyCustomer}
                onCheckedChange={(c) => setUpdateForm(prev => ({ ...prev, notifyCustomer: !!c }))}
              />
              <Label htmlFor="notify" className="cursor-pointer">
                Notify customer of status change
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitStatusUpdate} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Cancel Shipment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel this shipment? This action cannot be undone.
            </p>

            <div>
              <Label>Reason for cancellation</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Shipment
            </Button>
            <Button variant="destructive" onClick={submitCancel} disabled={cancelShipment.isPending}>
              {cancelShipment.isPending ? "Cancelling..." : "Cancel Shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
