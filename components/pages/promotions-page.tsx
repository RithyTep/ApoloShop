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
import { Plus, Pencil, Trash } from "lucide-react"
import { usePromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion, Promotion } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"

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
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Promotions</h1>
            <p className="text-muted-foreground mt-2">Manage discount codes and promotions</p>
          </div>
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Promotions</h1>
          <p className="text-muted-foreground mt-2">Manage discount codes and promotions</p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} /> Add Promotion
        </Button>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-border bg-background rounded text-sm"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive/Expired</option>
          </select>
          <div className="text-sm text-muted-foreground">
            {promotions.length} promotions
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="overflow-x-auto">
          {promotions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-foreground font-semibold">Code</TableHead>
                  <TableHead className="text-foreground font-semibold">Type</TableHead>
                  <TableHead className="text-foreground font-semibold">Value</TableHead>
                  <TableHead className="text-foreground font-semibold">Usage</TableHead>
                  <TableHead className="text-foreground font-semibold">Valid Period</TableHead>
                  <TableHead className="text-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-foreground font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => {
                  const status = getPromoStatus(promo)
                  return (
                    <TableRow key={promo.id} className="border-b border-border hover:bg-muted/50">
                      <TableCell className="text-foreground font-medium font-mono">{promo.code}</TableCell>
                      <TableCell className="text-foreground text-sm">{promo.type.replace("_", " ")}</TableCell>
                      <TableCell className="text-foreground">{formatValue(promo)}</TableCell>
                      <TableCell className="text-foreground text-sm">
                        {promo.usedCount || 0}{promo.usageLimit ? ` / ${promo.usageLimit}` : ""}
                      </TableCell>
                      <TableCell className="text-foreground text-sm">
                        {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="rounded-sm">
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-transparent"
                            onClick={() => openEditDialog(promo)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive bg-transparent"
                            onClick={() => setDeletePromo(promo)}
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No promotions found. Create your first promotion!
            </div>
          )}
        </div>
      </Card>

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
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof promoTypes[number] })}
                  className="w-full px-3 py-2 border border-border bg-background rounded text-sm"
                >
                  {promoTypes.map((t) => (
                    <option key={t} value={t}>{t.replace("_", " ")}</option>
                  ))}
                </select>
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
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-foreground">Active</span>
                </label>
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
