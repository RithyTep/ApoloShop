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
import { ImageUpload } from "@/components/ui/image-upload"
import { Plus, Pencil, Trash, Upload, Download } from "lucide-react"
import { useProducts, useCategories, useCreateProduct, useUpdateProduct, useDeleteProduct, Product } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import { ProductImportDialog, ProductExportButton } from "@/components/product-import-export"

export function ProductsPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [forceDeleteProduct, setForceDeleteProduct] = useState<Product | null>(null)

  const { data: productsData, isLoading } = useProducts(categoryFilter && categoryFilter !== "all" ? categoryFilter : undefined)
  const { data: categoriesData } = useCategories()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()

  const categories = categoriesData?.categories || []
  const allProducts = productsData?.products || []

  // Client-side filtering for search and status
  const products = allProducts.filter((p) => {
    const matchesSearch = !search ||
      p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      p.nameKh.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !statusFilter || statusFilter === "all" ||
      (statusFilter === "active" && p.isActive) ||
      (statusFilter === "inactive" && !p.isActive)
    return matchesSearch && matchesStatus
  })

  const [formData, setFormData] = useState({
    nameEn: "",
    nameKh: "",
    priceUsd: "",
    priceKhr: "",
    categoryId: "",
    sku: "",
    imageUrl: "",
    isActive: true,
  })

  const resetForm = () => {
    setFormData({
      nameEn: "",
      nameKh: "",
      priceUsd: "",
      priceKhr: "",
      categoryId: "",
      sku: "",
      imageUrl: "",
      isActive: true,
    })
    setEditingProduct(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      nameEn: product.nameEn,
      nameKh: product.nameKh,
      priceUsd: product.priceUsd.toString(),
      priceKhr: product.priceKhr.toString(),
      categoryId: product.categoryId,
      sku: product.sku,
      imageUrl: product.imageUrl || "",
      isActive: product.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const data = {
        nameEn: formData.nameEn,
        nameKh: formData.nameKh,
        priceUsd: parseFloat(formData.priceUsd),
        priceKhr: parseInt(formData.priceKhr),
        categoryId: formData.categoryId,
        sku: formData.sku,
        imageUrl: formData.imageUrl || null,
        isActive: formData.isActive,
      }

      if (editingProduct) {
        await updateMutation.mutateAsync({ id: editingProduct.id, ...data })
        toast({ title: "Product updated successfully" })
      } else {
        await createMutation.mutateAsync(data)
        toast({ title: "Product created successfully" })
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!deleteProduct) return
    const product = deleteProduct
    setDeleteProduct(null)
    try {
      const result = await deleteMutation.mutateAsync({ id: product.id })
      if (result.softDeleted) {
        // Product has orders - ask if they want to force delete
        setForceDeleteProduct(product)
      } else {
        toast({ title: "Product deleted successfully" })
      }
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleForceDelete = async () => {
    if (!forceDeleteProduct) return
    const productId = forceDeleteProduct.id
    setForceDeleteProduct(null)
    try {
      await deleteMutation.mutateAsync({ id: productId, force: true })
      toast({ title: "Product permanently deleted" })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground mt-2">Manage your shop products and inventory</p>
          </div>
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

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-2">Manage your shop products and inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <ProductExportButton
            categoryId={categoryFilter}
            isActive={statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined}
          />
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload size={16} /> Import
          </Button>
          <Button onClick={openCreateDialog} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus size={16} /> Add Product
          </Button>
        </div>
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
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.nameEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          {products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-foreground font-semibold">Product Name</TableHead>
                  <TableHead className="text-foreground font-semibold">Khmer Name</TableHead>
                  <TableHead className="text-foreground font-semibold">Price</TableHead>
                  <TableHead className="text-foreground font-semibold">Stock</TableHead>
                  <TableHead className="text-foreground font-semibold">SKU</TableHead>
                  <TableHead className="text-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-foreground font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="border-b border-border hover:bg-muted/50">
                    <TableCell className="text-foreground font-medium">{product.nameEn}</TableCell>
                    <TableCell className="text-foreground">{product.nameKh}</TableCell>
                    <TableCell className="text-foreground">${Number(product.priceUsd).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (product.inventory?.quantity || 0) === 0
                            ? "destructive"
                            : (product.inventory?.quantity || 0) < (product.inventory?.minLevel || 10)
                            ? "secondary"
                            : "default"
                        }
                        className="rounded-sm"
                      >
                        {product.inventory?.quantity || 0} units
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground text-sm">{product.sku}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "default" : "secondary"} className="rounded-sm">
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs bg-transparent"
                        onClick={() => openEditDialog(product)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive bg-transparent"
                        onClick={() => setDeleteProduct(product)}
                      >
                        <Trash size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No products found
            </div>
          )}
        </div>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nameEn">Name (English)</Label>
                <Input
                  id="nameEn"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameKh">Name (Khmer)</Label>
                <Input
                  id="nameKh"
                  value={formData.nameKh}
                  onChange={(e) => setFormData({ ...formData, nameKh: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceUsd">Price (USD)</Label>
                <Input
                  id="priceUsd"
                  type="number"
                  step="0.01"
                  value={formData.priceUsd}
                  onChange={(e) => setFormData({ ...formData, priceUsd: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceKhr">Price (KHR)</Label>
                <Input
                  id="priceKhr"
                  type="number"
                  value={formData.priceKhr}
                  onChange={(e) => setFormData({ ...formData, priceKhr: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Product Image</Label>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                onRemove={() => setFormData({ ...formData, imageUrl: "" })}
                folder="products"
                aspectRatio="square"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
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
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteProduct?.nameEn}&quot;? This action cannot be undone.
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

      {/* Force Delete Confirmation (for products with orders) */}
      <AlertDialog open={!!forceDeleteProduct} onOpenChange={() => setForceDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Product Has Order History</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                &quot;{forceDeleteProduct?.nameEn}&quot; has been used in orders and was deactivated.
              </span>
              <span className="block font-medium text-destructive">
                Do you want to permanently delete it? The product name will be preserved in order history.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Deactivated</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <ProductImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
    </div>
  )
}
