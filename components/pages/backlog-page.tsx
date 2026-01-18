"use client"

import { useState } from "react"
import { Plus, GripVertical, X, Edit2, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  useBacklogItems,
  useCreateBacklogItem,
  useUpdateBacklogItem,
  useDeleteBacklogItem,
  type BacklogItem,
  type BacklogPriority,
  type BacklogStatus,
} from "@/lib/api-hooks"
import { toast } from "sonner"

const priorityColors: Record<BacklogPriority, string> = {
  LOW: "bg-muted-foreground",
  MEDIUM: "bg-info",
  HIGH: "bg-warning",
  CRITICAL: "bg-destructive",
}

const priorityLabels: Record<BacklogPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
}

const statusLabels: Record<BacklogStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
}

const statusColors: Record<BacklogStatus, string> = {
  TODO: "bg-muted border-border",
  IN_PROGRESS: "bg-info/10 border-info/20",
  DONE: "bg-success/10 border-success/20",
}

export function BacklogPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null)
  const [draggedItem, setDraggedItem] = useState<BacklogItem | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formPriority, setFormPriority] = useState<BacklogPriority>("MEDIUM")
  const [formStatus, setFormStatus] = useState<BacklogStatus>("TODO")

  // API hooks
  const { data, isLoading } = useBacklogItems()
  const createItem = useCreateBacklogItem()
  const updateItem = useUpdateBacklogItem()
  const deleteItem = useDeleteBacklogItem()

  const items = data?.items || []

  const resetForm = () => {
    setFormTitle("")
    setFormDescription("")
    setFormPriority("MEDIUM")
    setFormStatus("TODO")
    setEditingItem(null)
  }

  const handleAddItem = async () => {
    if (!formTitle.trim()) return

    try {
      await createItem.mutateAsync({
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        priority: formPriority,
      })
      resetForm()
      setIsAddDialogOpen(false)
      toast.success("Item added")
    } catch (error) {
      toast.error("Failed to add item")
    }
  }

  const handleUpdateItem = async () => {
    if (!editingItem || !formTitle.trim()) return

    try {
      await updateItem.mutateAsync({
        id: editingItem.id,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        priority: formPriority,
        status: formStatus,
      })
      resetForm()
      toast.success("Item updated")
    } catch (error) {
      toast.error("Failed to update item")
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id)
      toast.success("Item deleted")
    } catch (error) {
      toast.error("Failed to delete item")
    }
  }

  const handleStatusChange = async (id: string, newStatus: BacklogStatus) => {
    try {
      await updateItem.mutateAsync({ id, status: newStatus })
    } catch (error) {
      toast.error("Failed to update status")
    }
  }

  const handleDragStart = (item: BacklogItem) => {
    setDraggedItem(item)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (status: BacklogStatus) => {
    if (draggedItem && draggedItem.status !== status) {
      handleStatusChange(draggedItem.id, status)
    }
    setDraggedItem(null)
  }

  const openEditDialog = (item: BacklogItem) => {
    setEditingItem(item)
    setFormTitle(item.title)
    setFormDescription(item.description || "")
    setFormPriority(item.priority)
    setFormStatus(item.status)
  }

  const getItemsByStatus = (status: BacklogStatus) =>
    items.filter((item) => item.status === status)

  const columns: { status: BacklogStatus; title: string }[] = [
    { status: "TODO", title: "To Do" },
    { status: "IN_PROGRESS", title: "In Progress" },
    { status: "DONE", title: "Done" },
  ]

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Feature Backlog</h1>
          <p className="text-muted-foreground mt-2">
            Development environment only - Track feature requirements
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Feature title..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the feature..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formPriority}
                  onValueChange={(v) => setFormPriority(v as BacklogPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddItem}
                className="w-full"
                disabled={createItem.isPending}
              >
                {createItem.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Add Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {columns.map(({ status, title }) => (
          <Card key={status} className={cn("border", statusColors[status])}>
            <CardContent className="py-3">
              <div className="text-sm text-muted-foreground">{title}</div>
              <div className="text-2xl font-bold">
                {getItemsByStatus(status).length}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-3 gap-4">
        {columns.map(({ status, title }) => (
          <div
            key={status}
            className={cn(
              "rounded-lg border-2 border-dashed p-4 min-h-[500px]",
              statusColors[status],
              draggedItem && "border-primary"
            )}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(status)}
          >
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              {title} ({getItemsByStatus(status).length})
            </h3>

            <div className="space-y-3">
              {getItemsByStatus(status).map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow",
                    draggedItem?.id === item.id && "opacity-50"
                  )}
                  draggable
                  onDragStart={() => handleDragStart(item)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {item.title}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-white text-[10px]",
                                priorityColors[item.priority]
                              )}
                            >
                              {priorityLabels[item.priority]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deleteItem.isPending}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="Feature title..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe the feature..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select
                value={formPriority}
                onValueChange={(v) => setFormPriority(v as BacklogPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formStatus}
                onValueChange={(v) => setFormStatus(v as BacklogStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleUpdateItem}
              className="w-full"
              disabled={updateItem.isPending}
            >
              {updateItem.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
