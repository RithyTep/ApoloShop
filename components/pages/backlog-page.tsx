"use client"

import { useState, useEffect } from "react"
import { Plus, GripVertical, X, Edit2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

type Priority = "low" | "medium" | "high" | "critical"
type Status = "todo" | "in_progress" | "done"

interface BacklogItem {
  id: string
  title: string
  description: string
  priority: Priority
  status: Status
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "apoloshop_backlog"

const priorityColors: Record<Priority, string> = {
  low: "bg-slate-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
}

const priorityLabels: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
}

const statusLabels: Record<Status, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
}

const statusColors: Record<Status, string> = {
  todo: "bg-slate-100 border-slate-300",
  in_progress: "bg-blue-50 border-blue-300",
  done: "bg-green-50 border-green-300",
}

export function BacklogPage() {
  const [items, setItems] = useState<BacklogItem[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null)
  const [draggedItem, setDraggedItem] = useState<BacklogItem | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formPriority, setFormPriority] = useState<Priority>("medium")

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setItems(JSON.parse(stored))
      } catch {
        console.error("Failed to parse backlog from localStorage")
      }
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const resetForm = () => {
    setFormTitle("")
    setFormDescription("")
    setFormPriority("medium")
    setEditingItem(null)
  }

  const handleAddItem = () => {
    if (!formTitle.trim()) return

    const now = new Date().toISOString()
    const newItem: BacklogItem = {
      id: crypto.randomUUID(),
      title: formTitle.trim(),
      description: formDescription.trim(),
      priority: formPriority,
      status: "todo",
      createdAt: now,
      updatedAt: now,
    }

    setItems((prev) => [...prev, newItem])
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleUpdateItem = () => {
    if (!editingItem || !formTitle.trim()) return

    setItems((prev) =>
      prev.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              title: formTitle.trim(),
              description: formDescription.trim(),
              priority: formPriority,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    resetForm()
  }

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleStatusChange = (id: string, newStatus: Status) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: newStatus, updatedAt: new Date().toISOString() }
          : item
      )
    )
  }

  const handleDragStart = (item: BacklogItem) => {
    setDraggedItem(item)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (status: Status) => {
    if (draggedItem && draggedItem.status !== status) {
      handleStatusChange(draggedItem.id, status)
    }
    setDraggedItem(null)
  }

  const openEditDialog = (item: BacklogItem) => {
    setEditingItem(item)
    setFormTitle(item.title)
    setFormDescription(item.description)
    setFormPriority(item.priority)
  }

  const getItemsByStatus = (status: Status) =>
    items.filter((item) => item.status === status)

  const columns: { status: Status; title: string }[] = [
    { status: "todo", title: "To Do" },
    { status: "in_progress", title: "In Progress" },
    { status: "done", title: "Done" },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Feature Backlog</h1>
          <p className="text-muted-foreground text-sm">
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
                  onValueChange={(v) => setFormPriority(v as Priority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddItem} className="w-full">
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
                onValueChange={(v) => setFormPriority(v as Priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editingItem?.status}
                onValueChange={(v) => {
                  if (editingItem) {
                    handleStatusChange(editingItem.id, v as Status)
                    setEditingItem({ ...editingItem, status: v as Status })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdateItem} className="w-full">
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
