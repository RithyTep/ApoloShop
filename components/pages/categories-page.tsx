"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash, GripVertical } from "lucide-react"
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, Category } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import {
  AdminPageHeader,
  AdminDataCard,
  AdminEmptyState,
  AdminLoading,
  AdminBadge,
} from "@/components/admin"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface SortableCategoryItemProps {
  category: Category & { _count?: { products: number } }
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onToggleActive: (category: Category) => void
}

function SortableCategoryItem({ category, onEdit, onDelete, onToggleActive }: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 border border-border rounded hover:bg-muted/50 bg-card ${
        isDragging ? "shadow-lg ring-2 ring-primary" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={20} className="text-muted-foreground" />
      </button>
      <div className="flex-1">
        <p className="font-medium text-foreground">{category.nameEn}</p>
        <p className="text-sm text-muted-foreground">{category.nameKh}</p>
      </div>
      <div className="text-sm text-muted-foreground">
        {category._count?.products || 0} products
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={category.isActive}
          onCheckedChange={() => onToggleActive(category)}
        />
        <span className="text-sm text-foreground">Enabled</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 bg-transparent"
          onClick={() => onEdit(category)}
        >
          <Pencil size={14} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive bg-transparent"
          onClick={() => onDelete(category)}
        >
          <Trash size={14} />
        </Button>
      </div>
    </div>
  )
}

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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id)
      const newIndex = categories.findIndex((cat) => cat.id === over.id)

      const reorderedCategories = arrayMove(categories, oldIndex, newIndex)

      // Update sort orders for all affected categories
      try {
        const updates = reorderedCategories.map((cat, index) => ({
          id: cat.id,
          sortOrder: index,
        }))

        // Update each category's sort order
        await Promise.all(
          updates.map((update) =>
            updateMutation.mutateAsync({ id: update.id, sortOrder: update.sortOrder })
          )
        )

        toast({ title: "Categories reordered successfully" })
      } catch (error) {
        toast({ title: "Error", description: "Failed to reorder categories", variant: "destructive" })
      }
    }
  }

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
      <AdminLoading
        title="Categories"
        subtitle="Manage product categories with drag & drop reordering"
        rows={3}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Categories"
        subtitle="Manage product categories with drag & drop reordering"
      >
        <Button onClick={openCreateDialog}>
          <Plus size={16} className="mr-2" /> Add Category
        </Button>
      </AdminPageHeader>

      <AdminDataCard>
        {categories.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map((cat) => cat.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {categories.map((cat) => (
                  <SortableCategoryItem
                    key={cat.id}
                    category={cat}
                    onEdit={openEditDialog}
                    onDelete={setDeleteCategory}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <AdminEmptyState message="No categories found. Add your first category!" />
        )}
      </AdminDataCard>

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
