"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, ScanLine, Printer, Check, X } from "lucide-react"
import { useInventory, useUpdateInventory, InventoryItem } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { PrintPreviewDialog, PrintLabelButton } from "@/components/barcode-label"
import { BarcodeInfo, generateEAN13FromSKU } from "@/lib/sku-barcode-utils"
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

export function InventoryPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [adjustQuantity, setAdjustQuantity] = useState(0)
  const [adjustReason, setAdjustReason] = useState("")

  // Barcode scanning state
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scanResult, setScanResult] = useState<{
    code: string
    product?: InventoryItem
    notFound?: boolean
  } | null>(null)
  const [scanAction, setScanAction] = useState<'add' | 'subtract'>('add')
  const [scanQuantity, setScanQuantity] = useState(1)

  // Print labels state
  const [selectedForPrint, setSelectedForPrint] = useState<string[]>([])
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)

  const { data, isLoading, refetch } = useInventory()
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

  // Handle barcode scan
  const handleScan = async (code: string, info: BarcodeInfo) => {
    // Search for product by SKU or barcode
    const matchedItem = allItems.find(item => {
      if (!item.product) return false
      // Match by SKU
      if (item.product.sku.toUpperCase() === code.toUpperCase()) return true
      // Match by generated barcode
      const barcode = generateEAN13FromSKU(item.product.sku)
      return barcode === code
    })

    if (matchedItem) {
      setScanResult({ code, product: matchedItem })
      setScanQuantity(1)
    } else {
      setScanResult({ code, notFound: true })
      toast({
        title: "Product not found",
        description: `No product found for code: ${code}`,
        variant: "destructive",
      })
    }
  }

  // Apply scan adjustment
  const handleApplyScanAdjustment = async () => {
    if (!scanResult?.product) return

    const item = scanResult.product
    const change = scanAction === 'add' ? scanQuantity : -scanQuantity
    const newQuantity = Math.max(0, item.quantity + change)

    try {
      await updateMutation.mutateAsync({
        id: item.id,
        quantity: newQuantity,
        reason: `Scan ${scanAction}: ${scanQuantity}`,
      })
      toast({
        title: `Stock ${scanAction === 'add' ? 'added' : 'removed'}`,
        description: `${item.product?.nameEn}: ${item.quantity} → ${newQuantity}`,
      })
      setScanResult(null)
      refetch()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  // Toggle product selection for printing
  const togglePrintSelection = (id: string) => {
    setSelectedForPrint(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // Get products for printing
  const productsForPrint = allItems
    .filter(item => selectedForPrint.includes(item.id) && item.product)
    .map(item => ({
      id: item.product!.id,
      sku: item.product!.sku,
      nameEn: item.product!.nameEn,
      priceUsd: item.product!.priceUsd || 0,
      category: item.product!.category,
    }))

  if (isLoading) {
    return (
      <AdminLoading
        title="Inventory"
        subtitle="Track stock levels and manage inventory"
        rows={4}
      />
    )
  }

  // Calculate summary stats
  const lowStockCount = allItems.filter(i => i.quantity > 0 && i.quantity < i.minLevel).length
  const outOfStockCount = allItems.filter(i => i.quantity === 0).length

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Inventory"
        subtitle="Track stock levels and manage inventory"
      >
        <div className="flex items-center gap-2">
          {selectedForPrint.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsPrintDialogOpen(true)}
            >
              <Printer size={16} className="mr-2" />
              Print Labels ({selectedForPrint.length})
            </Button>
          )}
          <Button onClick={() => setIsScannerOpen(true)}>
            <ScanLine size={16} className="mr-2" />
            Scan to Add
          </Button>
        </div>
      </AdminPageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="text-2xl font-bold">{allItems.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Low Stock</p>
          <p className="text-2xl font-bold text-orange-500">{lowStockCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Out of Stock</p>
          <p className="text-2xl font-bold text-destructive">{outOfStockCount}</p>
        </Card>
      </div>

      <AdminFilterCardGrid columns={3}>
        <Input
          placeholder="Search by product name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Good">Good</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Out of Stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground flex items-center">
          {inventory.length} items
        </div>
      </AdminFilterCardGrid>

      <AdminDataCard>
        {inventory.length > 0 ? (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeadRow>
                <AdminTableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedForPrint.length === inventory.length && inventory.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedForPrint(inventory.map(i => i.id))
                      } else {
                        setSelectedForPrint([])
                      }
                    }}
                    className="rounded"
                  />
                </AdminTableHead>
                <AdminTableHead>Product</AdminTableHead>
                <AdminTableHead>SKU</AdminTableHead>
                <AdminTableHead>Barcode</AdminTableHead>
                <AdminTableHead>Current Stock</AdminTableHead>
                <AdminTableHead>Min Level</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Action</AdminTableHead>
              </AdminTableHeadRow>
            </AdminTableHeader>
            <AdminTableBody>
              {inventory.map((item) => {
                const status = getStatus(item.quantity, item.minLevel)
                const barcode = item.product ? generateEAN13FromSKU(item.product.sku) : '-'
                return (
                  <AdminTableRow key={item.id}>
                    <AdminTableCell>
                      <input
                        type="checkbox"
                        checked={selectedForPrint.includes(item.id)}
                        onChange={() => togglePrintSelection(item.id)}
                        className="rounded"
                      />
                    </AdminTableCell>
                    <AdminTableCell className="font-medium">{item.product?.nameEn || "Unknown"}</AdminTableCell>
                    <AdminTableCell className="font-mono text-sm">{item.product?.sku || "-"}</AdminTableCell>
                    <AdminTableCell className="font-mono text-xs text-muted-foreground">{barcode}</AdminTableCell>
                    <AdminTableCell className="font-medium">{item.quantity}</AdminTableCell>
                    <AdminTableCell>
                      <Input
                        type="number"
                        className="w-20 h-8 text-sm"
                        value={item.minLevel}
                        onChange={(e) => handleUpdateMinLevel(item, parseInt(e.target.value) || 0)}
                        min={0}
                      />
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge
                        variant={
                          status === "Out of Stock" ? "destructive" : status === "Low" ? "secondary" : "default"
                        }
                      >
                        {status}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs bg-transparent"
                          onClick={() => openAdjustDialog(item)}
                        >
                          Adjust
                        </Button>
                        {item.product && (
                          <PrintLabelButton
                            product={{
                              id: item.product.id,
                              sku: item.product.sku,
                              nameEn: item.product.nameEn,
                              priceUsd: item.product.priceUsd || 0,
                              category: item.product.category,
                            }}
                            size="sm"
                          />
                        )}
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                )
              })}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <AdminEmptyState message="No inventory items found" />
        )}
      </AdminDataCard>

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

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleScan}
        title="Scan to Add Stock"
        description="Scan product barcode or SKU to quickly update inventory"
      />

      {/* Scan Result Dialog */}
      <Dialog open={!!scanResult?.product} onOpenChange={() => setScanResult(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Product Found
            </DialogTitle>
          </DialogHeader>
          {scanResult?.product && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold">{scanResult.product.product?.nameEn}</p>
                <p className="text-sm text-muted-foreground">SKU: {scanResult.product.product?.sku}</p>
                <p className="text-sm text-muted-foreground">Scanned: {scanResult.code}</p>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-3xl font-bold">{scanResult.product.quantity}</p>
              </div>

              <div className="space-y-2">
                <Label>Action</Label>
                <div className="flex gap-2">
                  <Button
                    variant={scanAction === 'add' ? 'default' : 'outline'}
                    onClick={() => setScanAction('add')}
                    className="flex-1"
                  >
                    <Plus size={16} className="mr-1" /> Add
                  </Button>
                  <Button
                    variant={scanAction === 'subtract' ? 'default' : 'outline'}
                    onClick={() => setScanAction('subtract')}
                    className="flex-1"
                  >
                    <Minus size={16} className="mr-1" /> Remove
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScanQuantity(Math.max(1, scanQuantity - 1))}
                  >
                    <Minus size={16} />
                  </Button>
                  <Input
                    type="number"
                    value={scanQuantity}
                    onChange={(e) => setScanQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center"
                    min={1}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScanQuantity(scanQuantity + 1)}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  New stock: {Math.max(0, scanResult.product.quantity + (scanAction === 'add' ? scanQuantity : -scanQuantity))}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanResult(null)}>
              <X size={16} className="mr-1" /> Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setScanResult(null)
                setIsScannerOpen(true)
              }}
            >
              <ScanLine size={16} className="mr-1" /> Scan Another
            </Button>
            <Button onClick={handleApplyScanAdjustment} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Labels Dialog */}
      <PrintPreviewDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        products={productsForPrint}
      />
    </div>
  )
}
