"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { useCMSContent, useCreateCMSContent, useUpdateCMSContent, useDeleteCMSContent, CMSContent, CMSContentType } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import {
  AdminPageHeader,
  AdminFilterCard,
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
  AdminViewButton,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"

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

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case "PUBLISHED": return "default"
      case "DRAFT": return "secondary"
      case "ARCHIVED": return "outline"
      default: return "secondary"
    }
  }

  if (isLoading) {
    return (
      <AdminLoading
        title="Content Management"
        subtitle="Manage pages, blog posts, and SEO content"
        rows={3}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Content Management"
        subtitle="Manage pages, blog posts, and SEO content"
      >
        <Button onClick={openCreateDialog} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} /> Add Content
        </Button>
      </AdminPageHeader>

      {/* Filter */}
      <AdminFilterCard>
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
      </AdminFilterCard>

      <AdminDataCard>
        {contents.length > 0 ? (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeadRow>
                <AdminTableHead>Title</AdminTableHead>
                <AdminTableHead>Type</AdminTableHead>
                <AdminTableHead>Slug</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Last Edited</AdminTableHead>
                <AdminTableHead>Actions</AdminTableHead>
              </AdminTableHeadRow>
            </AdminTableHeader>
            <AdminTableBody>
              {contents.map((content) => (
                <AdminTableRow key={content.id}>
                  <AdminTableCell>
                    <div>
                      <p className="font-medium">{content.titleEn}</p>
                      <p className="text-sm text-muted-foreground">{content.titleKh}</p>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell className="text-sm">{content.type}</AdminTableCell>
                  <AdminTableCell className="text-sm font-mono">/{content.slug}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge variant={getStatusVariant(content.status)}>
                      {content.status}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell className="text-sm">
                    {formatDate(content.updatedAt)}
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminActionButtons>
                      {content.status === "PUBLISHED" && (
                        <AdminViewButton onClick={() => window.open(`/${content.slug}`, "_blank")} />
                      )}
                      <AdminEditButton onClick={() => openEditDialog(content)} />
                      <AdminDeleteButton onClick={() => setDeleteContent(content)} />
                    </AdminActionButtons>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <AdminEmptyState message="No content found. Create your first page!" />
        )}
      </AdminDataCard>

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
