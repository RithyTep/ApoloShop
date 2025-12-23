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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash, Eye } from "lucide-react"
import { useCMSContent, useCreateCMSContent, useUpdateCMSContent, useDeleteCMSContent, CMSContent, CMSContentType } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"

const contentTypes: CMSContentType[] = ["PAGE", "BLOG", "BANNER", "FAQ"]
const statusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const

export function ContentPage() {
  const { toast } = useToast()
  const [typeFilter, setTypeFilter] = useState<CMSContentType | "">("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContent, setEditingContent] = useState<CMSContent | null>(null)
  const [deleteContent, setDeleteContent] = useState<CMSContent | null>(null)

  const { data, isLoading } = useCMSContent(typeFilter || undefined)
  const createMutation = useCreateCMSContent()
  const updateMutation = useUpdateCMSContent()
  const deleteMutation = useDeleteCMSContent()

  const contents = data?.contents || []

  const [formData, setFormData] = useState({
    type: "PAGE" as CMSContentType,
    titleEn: "",
    titleKh: "",
    slug: "",
    contentEn: "",
    contentKh: "",
    status: "DRAFT" as typeof statusOptions[number],
    metaTitle: "",
    metaDescription: "",
  })

  const resetForm = () => {
    setFormData({
      type: "PAGE",
      titleEn: "",
      titleKh: "",
      slug: "",
      contentEn: "",
      contentKh: "",
      status: "DRAFT",
      metaTitle: "",
      metaDescription: "",
    })
    setEditingContent(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (content: CMSContent) => {
    setEditingContent(content)
    setFormData({
      type: content.type as CMSContentType,
      titleEn: content.titleEn,
      titleKh: content.titleKh,
      slug: content.slug,
      contentEn: content.contentEn || "",
      contentKh: content.contentKh || "",
      status: content.status as typeof statusOptions[number],
      metaTitle: content.metaTitle || "",
      metaDescription: content.metaDescription || "",
    })
    setIsDialogOpen(true)
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  const handleSubmit = async () => {
    try {
      const data = {
        type: formData.type,
        titleEn: formData.titleEn,
        titleKh: formData.titleKh,
        slug: formData.slug || generateSlug(formData.titleEn),
        contentEn: formData.contentEn || undefined,
        contentKh: formData.contentKh || undefined,
        status: formData.status,
        metaTitle: formData.metaTitle || undefined,
        metaDescription: formData.metaDescription || undefined,
      }

      if (editingContent) {
        await updateMutation.mutateAsync({ id: editingContent.id, ...data })
        toast({ title: "Content updated successfully" })
      } else {
        await createMutation.mutateAsync(data)
        toast({ title: "Content created successfully" })
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!deleteContent) return
    try {
      await deleteMutation.mutateAsync(deleteContent.id)
      toast({ title: "Content deleted successfully" })
      setDeleteContent(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "default"
      case "DRAFT": return "secondary"
      case "ARCHIVED": return "outline"
      default: return "secondary"
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Content Management</h1>
            <p className="text-muted-foreground mt-2">Manage pages, blog posts, and SEO content</p>
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
          <h1 className="text-3xl font-bold text-foreground">Content Management</h1>
          <p className="text-muted-foreground mt-2">Manage pages, blog posts, and SEO content</p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} /> Add Content
        </Button>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v as CMSContentType)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {contentTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            {contents.length} items
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="overflow-x-auto">
          {contents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-foreground font-semibold">Title</TableHead>
                  <TableHead className="text-foreground font-semibold">Type</TableHead>
                  <TableHead className="text-foreground font-semibold">Slug</TableHead>
                  <TableHead className="text-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-foreground font-semibold">Last Edited</TableHead>
                  <TableHead className="text-foreground font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contents.map((content) => (
                  <TableRow key={content.id} className="border-b border-border hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="text-foreground font-medium">{content.titleEn}</p>
                        <p className="text-sm text-muted-foreground">{content.titleKh}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground text-sm">{content.type}</TableCell>
                    <TableCell className="text-foreground text-sm font-mono">/{content.slug}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(content.status)} className="rounded-sm">
                        {content.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground text-sm">
                      {formatDate(content.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {content.status === "PUBLISHED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-transparent"
                            onClick={() => window.open(`/${content.slug}`, "_blank")}
                          >
                            <Eye size={14} />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs bg-transparent"
                          onClick={() => openEditDialog(content)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-destructive hover:text-destructive bg-transparent"
                          onClick={() => setDeleteContent(content)}
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No content found. Create your first page!
            </div>
          )}
        </div>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContent ? "Edit Content" : "Add New Content"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as CMSContentType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as typeof statusOptions[number] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titleEn">Title (English)</Label>
                <Input
                  id="titleEn"
                  value={formData.titleEn}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      titleEn: e.target.value,
                      slug: formData.slug || generateSlug(e.target.value),
                    })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleKh">Title (Khmer)</Label>
                <Input
                  id="titleKh"
                  value={formData.titleKh}
                  onChange={(e) => setFormData({ ...formData, titleKh: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="auto-generated-from-title"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentEn">Content (English)</Label>
              <Textarea
                id="contentEn"
                value={formData.contentEn}
                onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
                className="min-h-[100px]"
                placeholder="Enter content in English..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentKh">Content (Khmer)</Label>
              <Textarea
                id="contentKh"
                value={formData.contentKh}
                onChange={(e) => setFormData({ ...formData, contentKh: e.target.value })}
                className="min-h-[100px]"
                placeholder="Enter content in Khmer..."
              />
            </div>
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">SEO Settings</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                    placeholder="Optional - defaults to title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                    className="min-h-[60px]"
                    placeholder="SEO description for search engines..."
                  />
                </div>
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
      <AlertDialog open={!!deleteContent} onOpenChange={() => setDeleteContent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteContent?.titleEn}&quot;? This action cannot be undone.
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
