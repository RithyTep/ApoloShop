"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Minus } from "lucide-react"
import { useInventory, useUpdateInventory, InventoryItem } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"

export function InventoryPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [adjustQuantity, setAdjustQuantity] = useState(0)
  const [adjustReason, setAdjustReason] = useState("")

  const { data, isLoading } = useInventory()
  const updateMutation = useUpdateInventory()

  const allItems = data?.inventory || []

  // Client-side filtering
  const inventory = allItems.filter((item) => {
    const matchesSearch = !search ||
      item.product?.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      item.product?.sku.toLowerCase().includes(search.toLowerCase())

    const status = getStatus(item.quantity, item.minLevel)
    const matchesStatus = !statusFilter || status === statusFilter

    return matchesSearch && matchesStatus
  })

  function getStatus(quantity: number, minLevel: number): string {
    if (quantity === 0) return "Out of Stock"
    if (quantity < minLevel) return "Low"
    return "Good"
  }

  const openAdjustDialog = (item: InventoryItem) => {
    setAdjustItem(item)
    setAdjustQuantity(0)
    setAdjustReason("")
  }

  const handleAdjust = async () => {
    if (!adjustItem) return
    try {
      const newQuantity = adjustItem.quantity + adjustQuantity
      await updateMutation.mutateAsync({
        id: adjustItem.id,
        quantity: newQuantity,
        reason: adjustReason || undefined,
      })
      toast({ title: `Stock adjusted by ${adjustQuantity > 0 ? "+" : ""}${adjustQuantity}` })
      setAdjustItem(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleUpdateMinLevel = async (item: InventoryItem, newMinLevel: number) => {
    try {
      await updateMutation.mutateAsync({ id: item.id, minLevel: newMinLevel })
      toast({ title: "Min level updated" })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-2">Track stock levels and manage inventory</p>
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  // Calculate summary stats
  const lowStockCount = allItems.filter(i => i.quantity > 0 && i.quantity < i.minLevel).length
  const outOfStockCount = allItems.filter(i => i.quantity === 0).length

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
        <p className="text-muted-foreground mt-2">Track stock levels and manage inventory</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="text-2xl font-bold">{allItems.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-500">{lowStockCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Out of Stock</p>
          <p className="text-2xl font-bold text-destructive">{outOfStockCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-border bg-background rounded text-sm"
          >
            <option value="">All Status</option>
            <option value="Good">Good</option>
            <option value="Low">Low</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
          <div className="text-sm text-muted-foreground flex items-center">
            {inventory.length} items
          </div>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          {inventory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-foreground font-semibold">Product</TableHead>
                  <TableHead className="text-foreground font-semibold">SKU</TableHead>
                  <TableHead className="text-foreground font-semibold">Current Stock</TableHead>
                  <TableHead className="text-foreground font-semibold">Min Level</TableHead>
                  <TableHead className="text-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-foreground font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => {
                  const status = getStatus(item.quantity, item.minLevel)
                  return (
                    <TableRow key={item.id} className="border-b border-border hover:bg-muted/50">
                      <TableCell className="text-foreground font-medium">{item.product?.nameEn || "Unknown"}</TableCell>
                      <TableCell className="text-foreground">{item.product?.sku || "-"}</TableCell>
                      <TableCell className="text-foreground font-medium">{item.quantity}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-20 h-8 text-sm"
                          value={item.minLevel}
                          onChange={(e) => handleUpdateMinLevel(item, parseInt(e.target.value) || 0)}
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            status === "Out of Stock" ? "destructive" : status === "Low" ? "secondary" : "default"
                          }
                          className="rounded-sm"
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs bg-transparent"
                          onClick={() => openAdjustDialog(item)}
                        >
                          Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No inventory items found
            </div>
          )}
        </div>
      </Card>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjustItem} onOpenChange={() => setAdjustItem(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock - {adjustItem?.product?.nameEn}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-3xl font-bold">{adjustItem?.quantity || 0}</p>
            </div>
            <div className="space-y-2">
              <Label>Adjustment</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustQuantity((prev) => prev - 1)}
                >
                  <Minus size={16} />
                </Button>
                <Input
                  type="number"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                  className="text-center"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustQuantity((prev) => prev + 1)}
                >
                  <Plus size={16} />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                New stock: {(adjustItem?.quantity || 0) + adjustQuantity}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g., Restock, Damaged, Correction"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustItem(null)}>Cancel</Button>
            <Button
              onClick={handleAdjust}
              disabled={updateMutation.isPending || adjustQuantity === 0}
            >
              {updateMutation.isPending ? "Saving..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
