"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  AlertCircle,
  Plus,
  Eye,
  Pencil,
  Search,
  RotateCcw,
} from "lucide-react"
import {
  useOrderTrackings,
  useOrderTracking,
  useCreateOrderTracking,
  useUpdateOrderTracking,
  useOrders,
  OrderTracking,
  TrackingStatus,
  CourierProvider,
  Order,
} from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"

const courierOptions: { value: CourierProvider; label: string }[] = [
  { value: "JT_EXPRESS", label: "J&T Express" },
  { value: "NINJA_VAN", label: "Ninja Van" },
  { value: "WING_DELIVERY", label: "Wing Delivery" },
  { value: "OTHER", label: "Other" },
]

const statusOptions: { value: TrackingStatus; label: string }[] = [
  { value: "PENDING", label: "Pending Pickup" },
  { value: "PICKED_UP", label: "Picked Up" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED_DELIVERY", label: "Delivery Failed" },
  { value: "RETURNED", label: "Returned" },
]

const statusIcons: Record<TrackingStatus, typeof Package> = {
  PENDING: Clock,
  PICKED_UP: Package,
  IN_TRANSIT: Truck,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle,
  FAILED_DELIVERY: AlertCircle,
  RETURNED: RotateCcw,
}

// Map status to badge variant
const statusBadgeVariant: Record<TrackingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PICKED_UP: "secondary",
  IN_TRANSIT: "secondary",
  OUT_FOR_DELIVERY: "outline",
  DELIVERED: "default",
  FAILED_DELIVERY: "destructive",
  RETURNED: "secondary",
}

interface CreateFormData {
  orderId: string
  trackingNumber: string
  courier: CourierProvider
  courierName: string
  estimatedDeliveryDate: string
  notifyOnStatusChange: boolean
  notifyViaTelegram: boolean
  notifyViaSms: boolean
}

interface UpdateFormData {
  id: string
  trackingNumber: string
  courier: CourierProvider
  courierName: string
  status: TrackingStatus
  estimatedDeliveryDate: string
  location: string
  notes: string
  notifyOnStatusChange: boolean
  notifyViaTelegram: boolean
  notifyViaSms: boolean
}

const emptyCreateForm: CreateFormData = {
  orderId: "",
  trackingNumber: "",
  courier: "JT_EXPRESS",
  courierName: "",
  estimatedDeliveryDate: "",
  notifyOnStatusChange: true,
  notifyViaTelegram: true,
  notifyViaSms: false,
}

export function OrderTrackingPage() {
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | "">("")
  const [search, setSearch] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedTracking, setSelectedTracking] = useState<OrderTracking | null>(null)

  const { data, isLoading } = useOrderTrackings(statusFilter ? { status: statusFilter } : undefined)
  const { data: ordersData } = useOrders()
  const createMutation = useCreateOrderTracking()
  const updateMutation = useUpdateOrderTracking()

  const trackings = data?.trackings || []
  const orders = ordersData?.orders || []

  // Get orders that don't have tracking yet
  const ordersWithoutTracking = orders.filter(
    (order) => !trackings.some((t) => t.orderId === order.id)
  )

  // Filter trackings
  const filteredTrackings = trackings.filter((t) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      t.trackingNumber?.toLowerCase().includes(searchLower) ||
      t.order?.orderNumber?.toLowerCase().includes(searchLower) ||
      t.order?.customer?.name?.toLowerCase().includes(searchLower)
    )
  })

  const [createForm, setCreateForm] = useState<CreateFormData>(emptyCreateForm)
  const [updateForm, setUpdateForm] = useState<UpdateFormData>({
    id: "",
    trackingNumber: "",
    courier: "JT_EXPRESS",
    courierName: "",
    status: "PENDING",
    estimatedDeliveryDate: "",
    location: "",
    notes: "",
    notifyOnStatusChange: true,
    notifyViaTelegram: true,
    notifyViaSms: false,
  })

  const resetCreateForm = () => setCreateForm(emptyCreateForm)

  const openCreateDialog = () => {
    resetCreateForm()
    setIsCreateDialogOpen(true)
  }

  const openUpdateDialog = (tracking: OrderTracking) => {
    setSelectedTracking(tracking)
    setUpdateForm({
      id: tracking.id,
      trackingNumber: tracking.trackingNumber || "",
      courier: tracking.courier,
      courierName: tracking.courierName || "",
      status: tracking.status,
      estimatedDeliveryDate: tracking.estimatedDeliveryDate
        ? new Date(tracking.estimatedDeliveryDate).toISOString().split("T")[0]
        : "",
      location: "",
      notes: "",
      notifyOnStatusChange: tracking.notifyOnStatusChange,
      notifyViaTelegram: tracking.notifyViaTelegram,
      notifyViaSms: tracking.notifyViaSms,
    })
    setIsUpdateDialogOpen(true)
  }

  const openViewDialog = (tracking: OrderTracking) => {
    setSelectedTracking(tracking)
    setIsViewDialogOpen(true)
  }

  const handleCreate = async () => {
    try {
      if (!createForm.orderId) {
        toast({ title: "Error", description: "Please select an order", variant: "destructive" })
        return
      }

      await createMutation.mutateAsync({
        orderId: createForm.orderId,
        trackingNumber: createForm.trackingNumber || undefined,
        courier: createForm.courier,
        courierName: createForm.courier === "OTHER" ? createForm.courierName : undefined,
        estimatedDeliveryDate: createForm.estimatedDeliveryDate
          ? new Date(createForm.estimatedDeliveryDate).toISOString()
          : undefined,
        notifyOnStatusChange: createForm.notifyOnStatusChange,
        notifyViaTelegram: createForm.notifyViaTelegram,
        notifyViaSms: createForm.notifyViaSms,
      })

      toast({ title: "Tracking created successfully" })
      setIsCreateDialogOpen(false)
      resetCreateForm()
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleUpdate = async () => {
    try {
      await updateMutation.mutateAsync({
        id: updateForm.id,
        trackingNumber: updateForm.trackingNumber || undefined,
        courier: updateForm.courier,
        courierName: updateForm.courier === "OTHER" ? updateForm.courierName : undefined,
        status: updateForm.status,
        estimatedDeliveryDate: updateForm.estimatedDeliveryDate
          ? new Date(updateForm.estimatedDeliveryDate).toISOString()
          : null,
        location: updateForm.location || undefined,
        notes: updateForm.notes || undefined,
        notifyOnStatusChange: updateForm.notifyOnStatusChange,
        notifyViaTelegram: updateForm.notifyViaTelegram,
        notifyViaSms: updateForm.notifyViaSms,
      })

      toast({ title: "Tracking updated successfully" })
      setIsUpdateDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
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
        title="Order Tracking"
        subtitle="Manage order shipments and tracking"
        rows={5}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Order Tracking"
        subtitle="Manage order shipments and tracking"
      >
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus size={16} /> Add Tracking
        </Button>
      </AdminPageHeader>

      {/* Filters */}
      <AdminFilterCardGrid columns={4}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order # or tracking #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? "" : (v as TrackingStatus))}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground flex items-center">
          {filteredTrackings.length} tracking records
        </div>
      </AdminFilterCardGrid>

      {/* Tracking Table */}
      <AdminDataCard>
        {filteredTrackings.length === 0 ? (
          <AdminEmptyState message="No tracking records found" />
        ) : (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeadRow>
                <AdminTableHead>Order #</AdminTableHead>
                <AdminTableHead>Customer</AdminTableHead>
                <AdminTableHead>Tracking #</AdminTableHead>
                <AdminTableHead>Courier</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Est. Delivery</AdminTableHead>
                <AdminTableHead>Actions</AdminTableHead>
              </AdminTableHeadRow>
            </AdminTableHeader>
            <AdminTableBody>
              {filteredTrackings.map((tracking) => {
                const StatusIcon = statusIcons[tracking.status]
                return (
                  <AdminTableRow key={tracking.id}>
                    <AdminTableCell className="font-mono font-medium">
                      {tracking.order?.orderNumber || "-"}
                    </AdminTableCell>
                    <AdminTableCell>{tracking.order?.customer?.name || "-"}</AdminTableCell>
                    <AdminTableCell className="font-mono">
                      {tracking.trackingNumber || "-"}
                    </AdminTableCell>
                    <AdminTableCell>
                      {tracking.courierName ||
                        courierOptions.find((c) => c.value === tracking.courier)?.label ||
                        tracking.courier}
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant={statusBadgeVariant[tracking.status]}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusOptions.find((s) => s.value === tracking.status)?.label}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      {tracking.estimatedDeliveryDate
                        ? formatDate(tracking.estimatedDeliveryDate)
                        : "-"}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openViewDialog(tracking)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openUpdateDialog(tracking)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                )
              })}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminDataCard>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Order</Label>
              <Select
                value={createForm.orderId}
                onValueChange={(v) => setCreateForm({ ...createForm, orderId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an order" />
                </SelectTrigger>
                <SelectContent>
                  {ordersWithoutTracking.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.orderNumber} - {order.customer?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Courier</Label>
                <Select
                  value={createForm.courier}
                  onValueChange={(v) =>
                    setCreateForm({ ...createForm, courier: v as CourierProvider })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {courierOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {createForm.courier === "OTHER" && (
                <div className="space-y-2">
                  <Label>Courier Name</Label>
                  <Input
                    value={createForm.courierName}
                    onChange={(e) => setCreateForm({ ...createForm, courierName: e.target.value })}
                    placeholder="Enter courier name"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input
                value={createForm.trackingNumber}
                onChange={(e) => setCreateForm({ ...createForm, trackingNumber: e.target.value })}
                placeholder="e.g., JT123456789"
              />
            </div>

            <div className="space-y-2">
              <Label>Estimated Delivery Date</Label>
              <Input
                type="date"
                value={createForm.estimatedDeliveryDate}
                onChange={(e) =>
                  setCreateForm({ ...createForm, estimatedDeliveryDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <p className="text-sm font-medium">Notification Settings</p>
              <div className="flex items-center justify-between">
                <Label>Notify on status change</Label>
                <Switch
                  checked={createForm.notifyOnStatusChange}
                  onCheckedChange={(v) => setCreateForm({ ...createForm, notifyOnStatusChange: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Via Telegram</Label>
                <Switch
                  checked={createForm.notifyViaTelegram}
                  onCheckedChange={(v) => setCreateForm({ ...createForm, notifyViaTelegram: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Via SMS</Label>
                <Switch
                  checked={createForm.notifyViaSms}
                  onCheckedChange={(v) => setCreateForm({ ...createForm, notifyViaSms: v })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Tracking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={updateForm.status}
                onValueChange={(v) => setUpdateForm({ ...updateForm, status: v as TrackingStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Courier</Label>
                <Select
                  value={updateForm.courier}
                  onValueChange={(v) =>
                    setUpdateForm({ ...updateForm, courier: v as CourierProvider })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {courierOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {updateForm.courier === "OTHER" && (
                <div className="space-y-2">
                  <Label>Courier Name</Label>
                  <Input
                    value={updateForm.courierName}
                    onChange={(e) => setUpdateForm({ ...updateForm, courierName: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input
                value={updateForm.trackingNumber}
                onChange={(e) => setUpdateForm({ ...updateForm, trackingNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Estimated Delivery Date</Label>
              <Input
                type="date"
                value={updateForm.estimatedDeliveryDate}
                onChange={(e) =>
                  setUpdateForm({ ...updateForm, estimatedDeliveryDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Location (for status update)</Label>
              <Input
                value={updateForm.location}
                onChange={(e) => setUpdateForm({ ...updateForm, location: e.target.value })}
                placeholder="e.g., Phnom Penh Hub"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (for status update)</Label>
              <Textarea
                value={updateForm.notes}
                onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                placeholder="Optional notes about this status update"
                rows={2}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <p className="text-sm font-medium">Notification Settings</p>
              <div className="flex items-center justify-between">
                <Label>Notify on status change</Label>
                <Switch
                  checked={updateForm.notifyOnStatusChange}
                  onCheckedChange={(v) => setUpdateForm({ ...updateForm, notifyOnStatusChange: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Via Telegram</Label>
                <Switch
                  checked={updateForm.notifyViaTelegram}
                  onCheckedChange={(v) => setUpdateForm({ ...updateForm, notifyViaTelegram: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Via SMS</Label>
                <Switch
                  checked={updateForm.notifyViaSms}
                  onCheckedChange={(v) => setUpdateForm({ ...updateForm, notifyViaSms: v })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Tracking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Tracking Details - {selectedTracking?.order?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedTracking && (
            <div className="space-y-6 py-4">
              {/* Current Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <AdminBadge variant={statusBadgeVariant[selectedTracking.status]}>
                    {statusOptions.find((s) => s.value === selectedTracking.status)?.label}
                  </AdminBadge>
                </div>
                {selectedTracking.trackingNumber && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Tracking #</p>
                    <p className="font-mono font-medium">{selectedTracking.trackingNumber}</p>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Courier</p>
                  <p className="font-medium">
                    {selectedTracking.courierName ||
                      courierOptions.find((c) => c.value === selectedTracking.courier)?.label}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedTracking.order?.customer?.name}</p>
                </div>
                {selectedTracking.estimatedDeliveryDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Delivery</p>
                    <p className="font-medium">
                      {formatDate(selectedTracking.estimatedDeliveryDate)}
                    </p>
                  </div>
                )}
                {selectedTracking.actualDeliveryDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Delivered On</p>
                    <p className="font-medium text-green-600">
                      {formatDate(selectedTracking.actualDeliveryDate)}
                    </p>
                  </div>
                )}
              </div>

              {/* Status History */}
              {selectedTracking.statusHistory && selectedTracking.statusHistory.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-4">Status History</h4>
                  <div className="space-y-3">
                    {selectedTracking.statusHistory.map((history, idx) => {
                      const StatusIcon = statusIcons[history.status]
                      return (
                        <div key={history.id} className="flex gap-3">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              idx === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            <StatusIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">
                                {statusOptions.find((s) => s.value === history.status)?.label}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(history.createdAt)}
                              </span>
                            </div>
                            {history.location && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {history.location}
                              </div>
                            )}
                            {history.notes && (
                              <p className="text-sm text-muted-foreground">{history.notes}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
