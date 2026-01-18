"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ImageUpload } from "@/components/ui/image-upload"
import { Plus, Upload, Wand2 } from "lucide-react"
import { useProducts, useCategories, useCreateProduct, useUpdateProduct, useDeleteProduct, Product } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import { ProductImportDialog, ProductExportButton } from "@/components/product-import-export"
import { PrintLabelButton } from "@/components/barcode-label"
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
  AdminActionButtons,
  AdminEditButton,
  AdminDeleteButton,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"

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

  // Auto-generate SKU based on category and product name
  const [isGeneratingSKU, setIsGeneratingSKU] = useState(false)

  const handleGenerateSKU = async () => {
    if (!formData.categoryId || !formData.nameEn) {
      toast({
        title: "Missing information",
        description: "Please select a category and enter a product name first",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingSKU(true)
    try {
      const response = await fetch('/api/sku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: formData.categoryId,
          productName: formData.nameEn,
          preview: false,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate SKU')
      }

      const data = await response.json()
      setFormData({ ...formData, sku: data.sku })
      toast({ title: `SKU generated: ${data.sku}` })
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setIsGeneratingSKU(false)
    }
  }

  if (isLoading) {
    return (
      <AdminLoading
        title="Products"
        subtitle="Manage your shop products and inventory"
        rows={4}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Products"
        subtitle="Manage your shop products and inventory"
      >
        <div className="flex items-center gap-2">
          <ProductExportButton
            categoryId={categoryFilter}
            isActive={statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined}
          />
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
          >
            <Upload size={16} className="mr-2" /> Import
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus size={16} className="mr-2" /> Add Product
          </Button>
        </div>
      </AdminPageHeader>

      <AdminFilterCardGrid columns={3}>
        <Input
          placeholder="Search by product name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
      </AdminFilterCardGrid>

      <AdminDataCard>
        {products.length > 0 ? (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeadRow>
                <AdminTableHead>Product Name</AdminTableHead>
                <AdminTableHead>Khmer Name</AdminTableHead>
                <AdminTableHead>Price</AdminTableHead>
                <AdminTableHead>Stock</AdminTableHead>
                <AdminTableHead>SKU</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Actions</AdminTableHead>
              </AdminTableHeadRow>
            </AdminTableHeader>
            <AdminTableBody>
              {products.map((product) => (
                <AdminTableRow key={product.id}>
                  <AdminTableCell className="font-medium">{product.nameEn}</AdminTableCell>
                  <AdminTableCell>{product.nameKh}</AdminTableCell>
                  <AdminTableCell>${Number(product.priceUsd).toFixed(2)}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge
                      variant={
                        (product.inventory?.quantity || 0) === 0
                          ? "destructive"
                          : (product.inventory?.quantity || 0) < (product.inventory?.minLevel || 10)
                          ? "secondary"
                          : "default"
                      }
                    >
                      {product.inventory?.quantity || 0} units
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell className="text-sm">{product.sku}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminActionButtons>
                      <AdminEditButton onClick={() => openEditDialog(product)} />
                      <PrintLabelButton
                        product={{
                          id: product.id,
                          sku: product.sku,
                          nameEn: product.nameEn,
                          priceUsd: product.priceUsd,
                          category: product.category,
                        }}
                        size="sm"
                      />
                      <AdminDeleteButton onClick={() => setDeleteProduct(product)} />
                    </AdminActionButtons>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <AdminEmptyState message="No products found" />
        )}
      </AdminDataCard>

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
                <div className="flex gap-2">
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="Enter or auto-generate"
                    className="flex-1 font-mono"
                  />
                  {!editingProduct && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleGenerateSKU}
                      disabled={isGeneratingSKU}
                      title="Auto-generate SKU"
                    >
                      <Wand2 size={16} className={isGeneratingSKU ? "animate-spin" : ""} />
                    </Button>
                  )}
                </div>
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
