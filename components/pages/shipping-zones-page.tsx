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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, MapPin, Clock } from "lucide-react"
import {
  AdminPageHeader,
  AdminDataCard,
  AdminTable,
  AdminTableHeader,
  AdminTableHeadRow,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminActionButtons,
  AdminEditButton,
  AdminDeleteButton,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"
import {
  useShippingZones,
  useCreateShippingZone,
  useUpdateShippingZone,
  useDeleteShippingZone,
  ShippingZone,
  ShippingRateType,
} from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import { CAMBODIA_PROVINCES, getProvinceByCode, SHIPPING_ZONE_PRESETS } from "@/lib/cambodia-regions"

const rateTypes: { value: ShippingRateType; label: string }[] = [
  { value: "FLAT_RATE", label: "Flat Rate" },
  { value: "WEIGHT_BASED", label: "Weight-Based" },
  { value: "FREE", label: "Free Shipping" },
]

interface FormData {
  nameEn: string
  nameKh: string
  regions: string[]
  rateType: ShippingRateType
  flatRateUsd: string
  flatRateKhr: string
  pricePerKgUsd: string
  pricePerKgKhr: string
  baseWeightKg: string
  freeThresholdUsd: string
  freeThresholdKhr: string
  minDeliveryDays: string
  maxDeliveryDays: string
  isActive: boolean
  sortOrder: string
}

const emptyFormData: FormData = {
  nameEn: "",
  nameKh: "",
  regions: [],
  rateType: "FLAT_RATE",
  flatRateUsd: "",
  flatRateKhr: "",
  pricePerKgUsd: "",
  pricePerKgKhr: "",
  baseWeightKg: "",
  freeThresholdUsd: "",
  freeThresholdKhr: "",
  minDeliveryDays: "",
  maxDeliveryDays: "",
  isActive: true,
  sortOrder: "0",
}

export function ShippingZonesPage() {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null)
  const [deleteZone, setDeleteZone] = useState<ShippingZone | null>(null)

  const { data, isLoading } = useShippingZones()
  const createMutation = useCreateShippingZone()
  const updateMutation = useUpdateShippingZone()
  const deleteMutation = useDeleteShippingZone()

  const zones = data?.zones || []

  const [formData, setFormData] = useState<FormData>(emptyFormData)

  const resetForm = () => {
    setFormData(emptyFormData)
    setEditingZone(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (zone: ShippingZone) => {
    setEditingZone(zone)
    setFormData({
      nameEn: zone.nameEn,
      nameKh: zone.nameKh,
      regions: zone.regions || [],
      rateType: zone.rateType,
      flatRateUsd: zone.flatRateUsd?.toString() || "",
      flatRateKhr: zone.flatRateKhr?.toString() || "",
      pricePerKgUsd: zone.pricePerKgUsd?.toString() || "",
      pricePerKgKhr: zone.pricePerKgKhr?.toString() || "",
      baseWeightKg: zone.baseWeightKg?.toString() || "",
      freeThresholdUsd: zone.freeThresholdUsd?.toString() || "",
      freeThresholdKhr: zone.freeThresholdKhr?.toString() || "",
      minDeliveryDays: zone.minDeliveryDays?.toString() || "",
      maxDeliveryDays: zone.maxDeliveryDays?.toString() || "",
      isActive: zone.isActive,
      sortOrder: zone.sortOrder.toString(),
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (!formData.nameEn || !formData.nameKh) {
        toast({ title: "Error", description: "Name is required in both languages", variant: "destructive" })
        return
      }

      if (formData.regions.length === 0) {
        toast({ title: "Error", description: "At least one region must be selected", variant: "destructive" })
        return
      }

      const payload = {
        nameEn: formData.nameEn,
        nameKh: formData.nameKh,
        regions: formData.regions,
        rateType: formData.rateType,
        flatRateUsd: formData.flatRateUsd ? parseFloat(formData.flatRateUsd) : null,
        flatRateKhr: formData.flatRateKhr ? parseInt(formData.flatRateKhr) : null,
        pricePerKgUsd: formData.pricePerKgUsd ? parseFloat(formData.pricePerKgUsd) : null,
        pricePerKgKhr: formData.pricePerKgKhr ? parseInt(formData.pricePerKgKhr) : null,
        baseWeightKg: formData.baseWeightKg ? parseFloat(formData.baseWeightKg) : null,
        freeThresholdUsd: formData.freeThresholdUsd ? parseFloat(formData.freeThresholdUsd) : null,
        freeThresholdKhr: formData.freeThresholdKhr ? parseInt(formData.freeThresholdKhr) : null,
        minDeliveryDays: formData.minDeliveryDays ? parseInt(formData.minDeliveryDays) : null,
        maxDeliveryDays: formData.maxDeliveryDays ? parseInt(formData.maxDeliveryDays) : null,
        isActive: formData.isActive,
        sortOrder: parseInt(formData.sortOrder) || 0,
      }

      if (editingZone) {
        await updateMutation.mutateAsync({ id: editingZone.id, ...payload })
        toast({ title: "Shipping zone updated successfully" })
      } else {
        await createMutation.mutateAsync(payload)
        toast({ title: "Shipping zone created successfully" })
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!deleteZone) return
    try {
      await deleteMutation.mutateAsync(deleteZone.id)
      toast({ title: "Shipping zone deleted successfully" })
      setDeleteZone(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const toggleRegion = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      regions: prev.regions.includes(code)
        ? prev.regions.filter((r) => r !== code)
        : [...prev.regions, code],
    }))
  }

  const selectPreset = (presetKey: keyof typeof SHIPPING_ZONE_PRESETS) => {
    setFormData((prev) => ({
      ...prev,
      regions: SHIPPING_ZONE_PRESETS[presetKey],
    }))
  }

  const formatRate = (zone: ShippingZone) => {
    switch (zone.rateType) {
      case "FREE":
        return "Free"
      case "FLAT_RATE":
        if (zone.flatRateUsd) return `$${Number(zone.flatRateUsd).toFixed(2)}`
        if (zone.flatRateKhr) return `${zone.flatRateKhr.toLocaleString()}៛`
        return "-"
      case "WEIGHT_BASED":
        if (zone.pricePerKgUsd) return `$${Number(zone.pricePerKgUsd).toFixed(2)}/kg`
        if (zone.pricePerKgKhr) return `${zone.pricePerKgKhr.toLocaleString()}៛/kg`
        return "-"
      default:
        return "-"
    }
  }

  const formatDeliveryTime = (zone: ShippingZone) => {
    if (!zone.minDeliveryDays && !zone.maxDeliveryDays) return "-"
    if (zone.minDeliveryDays && zone.maxDeliveryDays) {
      return `${zone.minDeliveryDays}-${zone.maxDeliveryDays} days`
    }
    if (zone.minDeliveryDays) return `${zone.minDeliveryDays}+ days`
    return `Up to ${zone.maxDeliveryDays} days`
  }

  const getRegionNames = (regionCodes: string[]) => {
    return regionCodes
      .map((code) => {
        const province = getProvinceByCode(code)
        return province ? province.nameEn : code
      })
      .join(", ")
  }

  if (isLoading) {
    return (
      <AdminLoading
        title="Shipping Zones"
        subtitle="Configure shipping rates by region for Cambodia"
        rows={5}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Shipping Zones"
        subtitle="Configure shipping rates by region for Cambodia"
      >
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Zone
        </Button>
      </AdminPageHeader>

      <AdminDataCard>
        {zones.length === 0 ? (
          <AdminEmptyState message="No shipping zones configured. Add your first zone to start." />
        ) : (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeadRow>
                <AdminTableHead>Zone Name</AdminTableHead>
                <AdminTableHead>Regions</AdminTableHead>
                <AdminTableHead>Rate Type</AdminTableHead>
                <AdminTableHead>Rate</AdminTableHead>
                <AdminTableHead>Delivery Time</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Actions</AdminTableHead>
              </AdminTableHeadRow>
            </AdminTableHeader>
            <AdminTableBody>
              {zones.map((zone) => (
                <AdminTableRow key={zone.id}>
                  <AdminTableCell>
                    <div>
                      <div className="font-medium">{zone.nameEn}</div>
                      <div className="text-sm text-muted-foreground">{zone.nameKh}</div>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {zone.regions.length} province{zone.regions.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge variant="outline">
                      {zone.rateType.replace("_", " ")}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell className="font-medium">{formatRate(zone)}</AdminTableCell>
                  <AdminTableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDeliveryTime(zone)}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge variant={zone.isActive ? "default" : "secondary"}>
                      {zone.isActive ? "Active" : "Inactive"}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminActionButtons>
                      <AdminEditButton onClick={() => openEditDialog(zone)} />
                      <AdminDeleteButton onClick={() => setDeleteZone(zone)} />
                    </AdminActionButtons>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminDataCard>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingZone ? "Edit Shipping Zone" : "Create Shipping Zone"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Zone Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nameEn">Name (English) *</Label>
                <Input
                  id="nameEn"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="e.g., Phnom Penh Metro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameKh">Name (Khmer) *</Label>
                <Input
                  id="nameKh"
                  value={formData.nameKh}
                  onChange={(e) => setFormData({ ...formData, nameKh: e.target.value })}
                  placeholder="e.g., រាជធានីភ្នំពេញ"
                />
              </div>
            </div>

            {/* Region Selection */}
            <div className="space-y-2">
              <Label>Provinces *</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                <Button type="button" variant="outline" size="sm" onClick={() => selectPreset("phnomPenh")}>
                  Phnom Penh Only
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => selectPreset("centralProvinces")}>
                  Central
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => selectPreset("allProvinces")}>
                  All Provinces
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, regions: [] })}>
                  Clear
                </Button>
              </div>
              <ScrollArea className="h-48 border rounded-md p-3">
                <div className="grid grid-cols-2 gap-2">
                  {CAMBODIA_PROVINCES.map((province) => (
                    <div key={province.code} className="flex items-center space-x-2">
                      <Checkbox
                        id={province.code}
                        checked={formData.regions.includes(province.code)}
                        onCheckedChange={() => toggleRegion(province.code)}
                      />
                      <label
                        htmlFor={province.code}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {province.nameEn}
                        <span className="text-muted-foreground ml-1">({province.nameKh})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-sm text-muted-foreground">
                Selected: {formData.regions.length} province{formData.regions.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Rate Type */}
            <div className="space-y-2">
              <Label>Rate Type</Label>
              <Select
                value={formData.rateType}
                onValueChange={(value: ShippingRateType) => setFormData({ ...formData, rateType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rateTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Flat Rate Fields */}
            {formData.rateType === "FLAT_RATE" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="flatRateUsd">Flat Rate (USD)</Label>
                  <Input
                    id="flatRateUsd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.flatRateUsd}
                    onChange={(e) => setFormData({ ...formData, flatRateUsd: e.target.value })}
                    placeholder="e.g., 2.50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flatRateKhr">Flat Rate (KHR)</Label>
                  <Input
                    id="flatRateKhr"
                    type="number"
                    min="0"
                    value={formData.flatRateKhr}
                    onChange={(e) => setFormData({ ...formData, flatRateKhr: e.target.value })}
                    placeholder="e.g., 10000"
                  />
                </div>
              </div>
            )}

            {/* Weight-Based Fields */}
            {formData.rateType === "WEIGHT_BASED" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pricePerKgUsd">Price per kg (USD)</Label>
                    <Input
                      id="pricePerKgUsd"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.pricePerKgUsd}
                      onChange={(e) => setFormData({ ...formData, pricePerKgUsd: e.target.value })}
                      placeholder="e.g., 1.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricePerKgKhr">Price per kg (KHR)</Label>
                    <Input
                      id="pricePerKgKhr"
                      type="number"
                      min="0"
                      value={formData.pricePerKgKhr}
                      onChange={(e) => setFormData({ ...formData, pricePerKgKhr: e.target.value })}
                      placeholder="e.g., 4000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseWeightKg">Base Weight (free up to, kg)</Label>
                  <Input
                    id="baseWeightKg"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.baseWeightKg}
                    onChange={(e) => setFormData({ ...formData, baseWeightKg: e.target.value })}
                    placeholder="e.g., 1.0 (first 1kg free)"
                  />
                </div>
              </div>
            )}

            {/* Free Shipping Threshold */}
            {formData.rateType !== "FREE" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="freeThresholdUsd">Free Shipping Over (USD)</Label>
                  <Input
                    id="freeThresholdUsd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.freeThresholdUsd}
                    onChange={(e) => setFormData({ ...formData, freeThresholdUsd: e.target.value })}
                    placeholder="e.g., 50.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freeThresholdKhr">Free Shipping Over (KHR)</Label>
                  <Input
                    id="freeThresholdKhr"
                    type="number"
                    min="0"
                    value={formData.freeThresholdKhr}
                    onChange={(e) => setFormData({ ...formData, freeThresholdKhr: e.target.value })}
                    placeholder="e.g., 200000"
                  />
                </div>
              </div>
            )}

            {/* Delivery Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minDeliveryDays">Min Delivery Days</Label>
                <Input
                  id="minDeliveryDays"
                  type="number"
                  min="0"
                  value={formData.minDeliveryDays}
                  onChange={(e) => setFormData({ ...formData, minDeliveryDays: e.target.value })}
                  placeholder="e.g., 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDeliveryDays">Max Delivery Days</Label>
                <Input
                  id="maxDeliveryDays"
                  type="number"
                  min="0"
                  value={formData.maxDeliveryDays}
                  onChange={(e) => setFormData({ ...formData, maxDeliveryDays: e.target.value })}
                  placeholder="e.g., 3"
                />
              </div>
            </div>

            {/* Sort Order and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingZone ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteZone} onOpenChange={() => setDeleteZone(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipping Zone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteZone?.nameEn}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
