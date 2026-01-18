"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus } from "lucide-react"
import { usePromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion, Promotion } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
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
  AdminEditButton,
  AdminDeleteButton,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"

const promoTypes = ["PERCENTAGE", "FIXED_AMOUNT", "BUY_X_GET_Y", "FREE_SHIPPING"] as const

export function PromotionsPage() {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [deletePromo, setDeletePromo] = useState<Promotion | null>(null)
  const [statusFilter, setStatusFilter] = useState("")

  const { data, isLoading } = usePromotions()
  const createMutation = useCreatePromotion()
  const updateMutation = useUpdatePromotion()
  const deleteMutation = useDeletePromotion()

  const allPromotions = data?.promotions || []

  // Filter by status
  const promotions = allPromotions.filter((p) => {
    if (!statusFilter) return true
    const isActive = p.isActive && new Date(p.startDate) <= new Date() && new Date(p.endDate) >= new Date()
    return statusFilter === "active" ? isActive : !isActive
  })

  const [formData, setFormData] = useState({
    code: "",
    type: "PERCENTAGE" as typeof promoTypes[number],
    value: "",
    minOrderUsd: "",
    usageLimit: "",
    startDate: "",
    endDate: "",
    isActive: true,
  })

  const resetForm = () => {
    setFormData({
      code: "",
      type: "PERCENTAGE",
      value: "",
      minOrderUsd: "",
      usageLimit: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      isActive: true,
    })
    setEditingPromo(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (promo: Promotion) => {
    setEditingPromo(promo)
    setFormData({
      code: promo.code,
      type: promo.type as typeof promoTypes[number],
      value: promo.value.toString(),
      minOrderUsd: promo.minOrderUsd?.toString() || "",
      usageLimit: promo.usageLimit?.toString() || "",
      startDate: new Date(promo.startDate).toISOString().split("T")[0],
      endDate: new Date(promo.endDate).toISOString().split("T")[0],
      isActive: promo.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const data = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        value: parseFloat(formData.value),
        minOrderUsd: formData.minOrderUsd ? parseFloat(formData.minOrderUsd) : undefined,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        isActive: formData.isActive,
      }

      if (editingPromo) {
        await updateMutation.mutateAsync({ id: editingPromo.id, ...data })
        toast({ title: "Promotion updated successfully" })
      } else {
        await createMutation.mutateAsync(data)
        toast({ title: "Promotion created successfully" })
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!deletePromo) return
    try {
      await deleteMutation.mutateAsync(deletePromo.id)
      toast({ title: "Promotion deleted successfully" })
      setDeletePromo(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const formatValue = (promo: Promotion) => {
    if (promo.type === "PERCENTAGE") return `${promo.value}%`
    if (promo.type === "FIXED_AMOUNT") return `$${promo.value.toFixed(2)}`
    return promo.value.toString()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getPromoStatus = (promo: Promotion) => {
    const now = new Date()
    const start = new Date(promo.startDate)
    const end = new Date(promo.endDate)

    if (!promo.isActive) return { label: "Disabled", variant: "secondary" as const }
    if (now < start) return { label: "Scheduled", variant: "outline" as const }
    if (now > end) return { label: "Expired", variant: "secondary" as const }
    return { label: "Active", variant: "default" as const }
  }

  if (isLoading) {
    return (
      <AdminLoading
        title="Promotions"
        subtitle="Manage discount codes and promotions"
        rows={3}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Promotions"
        subtitle="Manage discount codes and promotions"
      >
        <Button onClick={openCreateDialog}>
          <Plus size={16} className="mr-2" /> Add Promotion
        </Button>
      </AdminPageHeader>

      <AdminFilterCard>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive/Expired</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {promotions.length} promotions
        </div>
      </AdminFilterCard>

      <AdminDataCard>
        {promotions.length > 0 ? (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeadRow>
                <AdminTableHead>Code</AdminTableHead>
                <AdminTableHead>Type</AdminTableHead>
                <AdminTableHead>Value</AdminTableHead>
                <AdminTableHead>Usage</AdminTableHead>
                <AdminTableHead>Valid Period</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Actions</AdminTableHead>
              </AdminTableHeadRow>
            </AdminTableHeader>
            <AdminTableBody>
              {promotions.map((promo) => {
                const status = getPromoStatus(promo)
                return (
                  <AdminTableRow key={promo.id}>
                    <AdminTableCell className="font-medium font-mono">{promo.code}</AdminTableCell>
                    <AdminTableCell className="text-sm">{promo.type.replace("_", " ")}</AdminTableCell>
                    <AdminTableCell>{formatValue(promo)}</AdminTableCell>
                    <AdminTableCell className="text-sm">
                      {promo.usedCount || 0}{promo.usageLimit ? ` / ${promo.usageLimit}` : ""}
                    </AdminTableCell>
                    <AdminTableCell className="text-sm">
                      {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant={status.variant}>
                        {status.label}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminActionButtons>
                        <AdminEditButton onClick={() => openEditDialog(promo)} />
                        <AdminDeleteButton onClick={() => setDeletePromo(promo)} />
                      </AdminActionButtons>
                    </AdminTableCell>
                  </AdminTableRow>
                )
              })}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <AdminEmptyState message="No promotions found. Create your first promotion!" />
        )}
      </AdminDataCard>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPromo ? "Edit Promotion" : "Add New Promotion"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Promo Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER20"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as typeof promoTypes[number] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {promoTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">
                  Value {formData.type === "PERCENTAGE" ? "(%)" : "($)"}
                </Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minOrder">Min Order (USD)</Label>
                <Input
                  id="minOrder"
                  type="number"
                  value={formData.minOrderUsd}
                  onChange={(e) => setFormData({ ...formData, minOrderUsd: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div className="flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive" className="text-sm">Active</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePromo} onOpenChange={() => setDeletePromo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the promo code &quot;{deletePromo?.code}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
