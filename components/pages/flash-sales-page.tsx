"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Pencil,
  Trash,
  Zap,
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { FlashSaleCountdown } from "@/components/flash-sale-countdown"

interface FlashSaleProduct {
  id: string
  nameEn: string
  nameKh: string
  priceUsd: number
  priceKhr: number
  imageUrl: string | null
  category?: {
    nameEn: string
    nameKh: string
  }
}

interface FlashSale {
  id: string
  productId: string
  salePriceUsd: number
  salePriceKhr: number
  startTime: string
  endTime: string
  quantity: number | null
  soldCount: number
  remainingQuantity: number | null
  status: "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED"
  nameEn: string | null
  nameKh: string | null
  descriptionEn: string | null
  descriptionKh: string | null
  isFeatured: boolean
  bannerImageUrl: string | null
  product: FlashSaleProduct | null
  createdAt: string
}

const statusColors: Record<FlashSale["status"], { variant: "info" | "success" | "secondary" | "destructive" }> = {
  SCHEDULED: { variant: "info" },
  ACTIVE: { variant: "success" },
  ENDED: { variant: "secondary" },
  CANCELLED: { variant: "destructive" },
}

export function FlashSalesPage() {
  const { toast } = useToast()
  const [flashSales, setFlashSales] = useState<FlashSale[]>([])
  const [products, setProducts] = useState<FlashSaleProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "calendar">("list")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<FlashSale | null>(null)
  const [deleteSale, setDeleteSale] = useState<FlashSale | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date())

  // Form state
  const [formData, setFormData] = useState({
    productId: "",
    salePriceUsd: "",
    startTime: "",
    endTime: "",
    quantity: "",
    nameEn: "",
    nameKh: "",
    descriptionEn: "",
    descriptionKh: "",
    isFeatured: false,
    bannerImageUrl: "",
  })

  useEffect(() => {
    fetchFlashSales()
    fetchProducts()
  }, [])

  const fetchFlashSales = async () => {
    try {
      const response = await fetch("/api/flash-sales?limit=100")
      if (response.ok) {
        const data = await response.json()
        setFlashSales(data.flashSales || [])
      }
    } catch (error) {
      console.error("Error fetching flash sales:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?limit=100")
      if (response.ok) {
        const data = await response.json()
        setProducts(
          data.products?.map((p: FlashSaleProduct & { category?: { nameEn: string; nameKh: string } }) => ({
            id: p.id,
            nameEn: p.nameEn,
            nameKh: p.nameKh,
            priceUsd: p.priceUsd,
            priceKhr: p.priceKhr,
            imageUrl: p.imageUrl,
            category: p.category,
          })) || []
        )
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const filteredSales = useMemo(() => {
    if (statusFilter === "all") return flashSales
    return flashSales.filter((s) => s.status === statusFilter)
  }, [flashSales, statusFilter])

  const resetForm = () => {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    setFormData({
      productId: "",
      salePriceUsd: "",
      startTime: now.toISOString().slice(0, 16),
      endTime: tomorrow.toISOString().slice(0, 16),
      quantity: "",
      nameEn: "",
      nameKh: "",
      descriptionEn: "",
      descriptionKh: "",
      isFeatured: false,
      bannerImageUrl: "",
    })
    setEditingSale(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (sale: FlashSale) => {
    setEditingSale(sale)
    setFormData({
      productId: sale.productId,
      salePriceUsd: sale.salePriceUsd.toString(),
      startTime: new Date(sale.startTime).toISOString().slice(0, 16),
      endTime: new Date(sale.endTime).toISOString().slice(0, 16),
      quantity: sale.quantity?.toString() || "",
      nameEn: sale.nameEn || "",
      nameKh: sale.nameKh || "",
      descriptionEn: sale.descriptionEn || "",
      descriptionKh: sale.descriptionKh || "",
      isFeatured: sale.isFeatured,
      bannerImageUrl: sale.bannerImageUrl || "",
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        productId: formData.productId,
        salePriceUsd: parseFloat(formData.salePriceUsd),
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
        nameEn: formData.nameEn || null,
        nameKh: formData.nameKh || null,
        descriptionEn: formData.descriptionEn || null,
        descriptionKh: formData.descriptionKh || null,
        isFeatured: formData.isFeatured,
        bannerImageUrl: formData.bannerImageUrl || null,
      }

      if (editingSale) {
        const response = await fetch("/api/flash-sales", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingSale.id, ...payload }),
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to update flash sale")
        }
        toast({ title: "Flash sale updated successfully" })
      } else {
        const response = await fetch("/api/flash-sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to create flash sale")
        }
        toast({ title: "Flash sale created successfully" })
      }

      setIsDialogOpen(false)
      resetForm()
      fetchFlashSales()
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleCancel = async (sale: FlashSale) => {
    try {
      const response = await fetch(
        `/api/flash-sales?id=${sale.id}&cancel=true`,
        { method: "DELETE" }
      )
      if (!response.ok) throw new Error("Failed to cancel flash sale")
      toast({ title: "Flash sale cancelled" })
      fetchFlashSales()
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteSale) return
    try {
      const response = await fetch(`/api/flash-sales?id=${deleteSale.id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete flash sale")
      toast({ title: "Flash sale deleted" })
      setDeleteSale(null)
      fetchFlashSales()
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const selectedProduct = products.find((p) => p.id === formData.productId)
  const discountPercentage =
    selectedProduct && formData.salePriceUsd
      ? Math.round(
          ((selectedProduct.priceUsd - parseFloat(formData.salePriceUsd)) /
            selectedProduct.priceUsd) *
            100
        )
      : 0

  // Calendar helpers
  const calendarMonth = calendarDate.getMonth()
  const calendarYear = calendarDate.getFullYear()
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay()
  const monthName = calendarDate.toLocaleString("default", { month: "long" })

  const salesByDate = useMemo(() => {
    const map = new Map<string, FlashSale[]>()
    flashSales.forEach((sale) => {
      const start = new Date(sale.startTime)
      const end = new Date(sale.endTime)
      // Add to each date the sale spans
      for (
        let d = new Date(start);
        d <= end;
        d.setDate(d.getDate() + 1)
      ) {
        const key = d.toISOString().split("T")[0]
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(sale)
      }
    })
    return map
  }, [flashSales])

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-warning/10 p-2">
            <Zap className="h-7 w-7 text-warning" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Flash Sales</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage time-limited deals
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          New Flash Sale
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {flashSales.filter((s) => s.status === "ACTIVE").length}
            </div>
            <p className="text-sm text-muted-foreground">Active Sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {flashSales.filter((s) => s.status === "SCHEDULED").length}
            </div>
            <p className="text-sm text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {flashSales.reduce((acc, s) => acc + s.soldCount, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Total Units Sold</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {flashSales.filter((s) => s.isFeatured).length}
            </div>
            <p className="text-sm text-muted-foreground">Featured Sales</p>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <Tabs
        value={view}
        onValueChange={(v) => setView(v as "list" | "calendar")}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>

          {view === "list" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="ENDED">Ended</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* List View */}
        <TabsContent value="list">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        No flash sales found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {sale.product?.imageUrl ? (
                              <img
                                src={sale.product.imageUrl}
                                alt=""
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                                <Zap className="h-4 w-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">
                                {sale.product?.nameEn || "Unknown Product"}
                              </div>
                              {sale.nameEn && (
                                <div className="text-xs text-muted-foreground">
                                  {sale.nameEn}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-destructive">
                              ${sale.salePriceUsd.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground line-through">
                              ${sale.product?.priceUsd.toFixed(2)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sale.product && (
                            <Badge variant="warning">
                              -
                              {Math.round(
                                ((sale.product.priceUsd - sale.salePriceUsd) /
                                  sale.product.priceUsd) *
                                  100
                              )}
                              %
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDate(sale.startTime)}</div>
                            <div className="text-muted-foreground">
                              → {formatDate(sale.endTime)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sale.quantity ? (
                            <div className="text-sm">
                              <div>
                                {sale.soldCount} / {sale.quantity} sold
                              </div>
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-warning"
                                  style={{
                                    width: `${(sale.soldCount / sale.quantity) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Unlimited
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColors[sale.status].variant}>
                            {sale.status}
                          </Badge>
                          {sale.isFeatured && (
                            <Badge
                              variant="outline"
                              className="ml-2 border-warning text-warning"
                            >
                              Featured
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(sale)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {(sale.status === "SCHEDULED" ||
                              sale.status === "ACTIVE") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancel(sale)}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteSale(sale)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCalendarDate(
                      new Date(calendarYear, calendarMonth - 1, 1)
                    )
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle>
                  {monthName} {calendarYear}
                </CardTitle>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCalendarDate(
                      new Date(calendarYear, calendarMonth + 1, 1)
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="py-2 text-center text-sm font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  )
                )}

                {/* Empty cells before first day */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24 rounded border" />
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  const daySales = salesByDate.get(dateKey) || []
                  const isToday =
                    new Date().toISOString().split("T")[0] === dateKey

                  return (
                    <div
                      key={day}
                      className={`h-24 overflow-hidden rounded border p-1 ${
                        isToday ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div
                        className={`text-sm ${isToday ? "font-bold text-primary" : ""}`}
                      >
                        {day}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {daySales.slice(0, 2).map((sale) => {
                          const variantClasses = {
                            info: "bg-info/10 text-info border-info/20",
                            success: "bg-success/10 text-success border-success/20",
                            secondary: "bg-secondary/10 text-secondary-foreground border-secondary/20",
                            destructive: "bg-destructive/10 text-destructive border-destructive/20",
                          }
                          return (
                            <div
                              key={sale.id}
                              className={`truncate rounded border px-1 py-0.5 text-xs ${variantClasses[statusColors[sale.status].variant]}`}
                              title={sale.product?.nameEn || ""}
                            >
                              {sale.product?.nameEn?.slice(0, 15)}
                              {(sale.product?.nameEn?.length || 0) > 15
                                ? "..."
                                : ""}
                            </div>
                          )
                        })}
                        {daySales.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{daySales.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-success" />
                  <span className="text-sm">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-info" />
                  <span className="text-sm">Scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-secondary" />
                  <span className="text-sm">Ended</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-destructive" />
                  <span className="text-sm">Cancelled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSale ? "Edit Flash Sale" : "Create Flash Sale"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Product Selection */}
            <div className="grid gap-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={formData.productId}
                onValueChange={(v) =>
                  setFormData({ ...formData, productId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nameEn} (${p.priceUsd.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pricing */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="salePrice">Sale Price (USD) *</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salePriceUsd}
                  onChange={(e) =>
                    setFormData({ ...formData, salePriceUsd: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>Discount Preview</Label>
                <div className="flex h-10 items-center rounded-md bg-muted px-3">
                  {selectedProduct && formData.salePriceUsd ? (
                    <span className="font-medium text-success">
                      {discountPercentage}% off ($
                      {(
                        selectedProduct.priceUsd -
                        parseFloat(formData.salePriceUsd)
                      ).toFixed(2)}{" "}
                      savings)
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Select product and enter price
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Time Range */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Quantity Limit */}
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity Limit (optional)</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="Leave empty for unlimited"
              />
            </div>

            {/* Sale Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nameEn">Sale Name (EN)</Label>
                <Input
                  id="nameEn"
                  value={formData.nameEn}
                  onChange={(e) =>
                    setFormData({ ...formData, nameEn: e.target.value })
                  }
                  placeholder="e.g., Summer Special"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nameKh">Sale Name (KH)</Label>
                <Input
                  id="nameKh"
                  value={formData.nameKh}
                  onChange={(e) =>
                    setFormData({ ...formData, nameKh: e.target.value })
                  }
                  placeholder="ឧទាហរណ៍: ពិសេសរដូវក្តៅ"
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="descEn">Description (EN)</Label>
                <Textarea
                  id="descEn"
                  rows={2}
                  value={formData.descriptionEn}
                  onChange={(e) =>
                    setFormData({ ...formData, descriptionEn: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descKh">Description (KH)</Label>
                <Textarea
                  id="descKh"
                  rows={2}
                  value={formData.descriptionKh}
                  onChange={(e) =>
                    setFormData({ ...formData, descriptionKh: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Banner Image */}
            <div className="grid gap-2">
              <Label htmlFor="bannerUrl">Banner Image URL</Label>
              <Input
                id="bannerUrl"
                value={formData.bannerImageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, bannerImageUrl: e.target.value })
                }
                placeholder="https://example.com/banner.jpg"
              />
            </div>

            {/* Featured Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="featured">Feature on Homepage</Label>
                <p className="text-sm text-muted-foreground">
                  Show this sale in the homepage banner carousel
                </p>
              </div>
              <Switch
                id="featured"
                checked={formData.isFeatured}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isFeatured: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.productId ||
                !formData.salePriceUsd ||
                !formData.startTime ||
                !formData.endTime
              }
            >
              {editingSale ? "Update" : "Create"} Flash Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSale} onOpenChange={() => setDeleteSale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flash Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the flash sale for &quot;
              {deleteSale?.product?.nameEn}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
