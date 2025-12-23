"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash, GripVertical } from "lucide-react"
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, Category } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"

export function CategoriesPage() {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)

  const { data, isLoading } = useCategories()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()

  const categories = data?.categories || []

  const [formData, setFormData] = useState({
    nameEn: "",
    nameKh: "",
    isActive: true,
    sortOrder: 0,
  })

  const resetForm = () => {
    setFormData({
      nameEn: "",
      nameKh: "",
      isActive: true,
      sortOrder: categories.length,
    })
    setEditingCategory(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setFormData((prev) => ({ ...prev, sortOrder: categories.length }))
    setIsDialogOpen(true)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      nameEn: category.nameEn,
      nameKh: category.nameKh,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, ...formData })
        toast({ title: "Category updated successfully" })
      } else {
        await createMutation.mutateAsync(formData)
        toast({ title: "Category created successfully" })
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!deleteCategory) return
    try {
      await deleteMutation.mutateAsync(deleteCategory.id)
      toast({ title: "Category deleted successfully" })
      setDeleteCategory(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleToggleActive = async (category: Category) => {
    try {
      await updateMutation.mutateAsync({ id: category.id, isActive: !category.isActive })
      toast({ title: `Category ${!category.isActive ? "enabled" : "disabled"}` })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Categories</h1>
            <p className="text-muted-foreground mt-2">Manage product categories with drag & drop reordering</p>
          </div>
        </div>
        <Card className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categories</h1>
          <p className="text-muted-foreground mt-2">Manage product categories with drag & drop reordering</p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} /> Add Category
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        {categories.length > 0 ? (
          categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-4 p-4 border border-border rounded hover:bg-muted/50">
              <GripVertical size={20} className="text-muted-foreground cursor-grab" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{cat.nameEn}</p>
                <p className="text-sm text-muted-foreground">{cat.nameKh}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {cat._count?.products || 0} products
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cat.isActive}
                  onChange={() => handleToggleActive(cat)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-foreground">Enabled</span>
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs bg-transparent"
                  onClick={() => openEditDialog(cat)}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-destructive hover:text-destructive bg-transparent"
                  onClick={() => setDeleteCategory(cat)}
                >
                  <Trash size={14} />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No categories found. Add your first category!
          </div>
        )}
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-border"
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
      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteCategory?.nameEn}&quot;?
              {(deleteCategory?._count?.products || 0) > 0 && (
                <span className="block mt-2 text-destructive">
                  This category has {deleteCategory?._count?.products} products. You must reassign them first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={(deleteCategory?._count?.products || 0) > 0}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
