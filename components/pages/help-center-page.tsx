"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash, Eye, FolderOpen, FileText, Star, TrendingUp } from "lucide-react"
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
  AdminViewButton,
  AdminEditButton,
  AdminDeleteButton,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"
import {
  useHelpCategories,
  useCreateHelpCategory,
  useUpdateHelpCategory,
  useDeleteHelpCategory,
  useHelpArticles,
  useCreateHelpArticle,
  useUpdateHelpArticle,
  useDeleteHelpArticle,
  HelpCategory,
  HelpArticle,
  HelpArticleStatus,
} from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"

const statusOptions: HelpArticleStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"]

export function HelpCenterPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("articles")

  // Categories state
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<HelpCategory | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<HelpCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    nameEn: "",
    nameKh: "",
    slug: "",
    description: "",
    sortOrder: 0,
    iconName: "",
    isActive: true,
  })

  // Articles state
  const [statusFilter, setStatusFilter] = useState<HelpArticleStatus | "">("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null)
  const [deleteArticle, setDeleteArticle] = useState<HelpArticle | null>(null)
  const [articleForm, setArticleForm] = useState({
    categoryId: "",
    titleEn: "",
    titleKh: "",
    slug: "",
    contentEn: "",
    contentKh: "",
    metaTitleEn: "",
    metaTitleKh: "",
    metaDescEn: "",
    metaDescKh: "",
    status: "DRAFT" as HelpArticleStatus,
    sortOrder: 0,
    isFeatured: false,
  })

  // Queries
  const { data: categoriesData, isLoading: categoriesLoading } = useHelpCategories()
  const { data: articlesData, isLoading: articlesLoading } = useHelpArticles({
    status: statusFilter || undefined,
    categoryId: categoryFilter || undefined,
  })

  // Mutations
  const createCategoryMutation = useCreateHelpCategory()
  const updateCategoryMutation = useUpdateHelpCategory()
  const deleteCategoryMutation = useDeleteHelpCategory()
  const createArticleMutation = useCreateHelpArticle()
  const updateArticleMutation = useUpdateHelpArticle()
  const deleteArticleMutation = useDeleteHelpArticle()

  const categories = categoriesData?.categories || []
  const articles = articlesData?.articles || []

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  // Category handlers
  const resetCategoryForm = () => {
    setCategoryForm({
      nameEn: "",
      nameKh: "",
      slug: "",
      description: "",
      sortOrder: 0,
      iconName: "",
      isActive: true,
    })
    setEditingCategory(null)
  }

  const openCreateCategoryDialog = () => {
    resetCategoryForm()
    setIsCategoryDialogOpen(true)
  }

  const openEditCategoryDialog = (category: HelpCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      nameEn: category.nameEn,
      nameKh: category.nameKh,
      slug: category.slug,
      description: category.description || "",
      sortOrder: category.sortOrder,
      iconName: category.iconName || "",
      isActive: category.isActive,
    })
    setIsCategoryDialogOpen(true)
  }

  const handleCategorySubmit = async () => {
    try {
      const data = {
        nameEn: categoryForm.nameEn,
        nameKh: categoryForm.nameKh,
        slug: categoryForm.slug || generateSlug(categoryForm.nameEn),
        description: categoryForm.description || undefined,
        sortOrder: categoryForm.sortOrder,
        iconName: categoryForm.iconName || undefined,
        isActive: categoryForm.isActive,
      }

      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({ id: editingCategory.id, ...data })
        toast({ title: "Category updated successfully" })
      } else {
        await createCategoryMutation.mutateAsync(data)
        toast({ title: "Category created successfully" })
      }
      setIsCategoryDialogOpen(false)
      resetCategoryForm()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleCategoryDelete = async () => {
    if (!deleteCategory) return
    try {
      await deleteCategoryMutation.mutateAsync(deleteCategory.id)
      toast({ title: "Category deleted successfully" })
      setDeleteCategory(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  // Article handlers
  const resetArticleForm = () => {
    setArticleForm({
      categoryId: "",
      titleEn: "",
      titleKh: "",
      slug: "",
      contentEn: "",
      contentKh: "",
      metaTitleEn: "",
      metaTitleKh: "",
      metaDescEn: "",
      metaDescKh: "",
      status: "DRAFT",
      sortOrder: 0,
      isFeatured: false,
    })
    setEditingArticle(null)
  }

  const openCreateArticleDialog = () => {
    resetArticleForm()
    setIsArticleDialogOpen(true)
  }

  const openEditArticleDialog = (article: HelpArticle) => {
    setEditingArticle(article)
    setArticleForm({
      categoryId: article.categoryId,
      titleEn: article.titleEn,
      titleKh: article.titleKh,
      slug: article.slug,
      contentEn: article.contentEn,
      contentKh: article.contentKh,
      metaTitleEn: article.metaTitleEn || "",
      metaTitleKh: article.metaTitleKh || "",
      metaDescEn: article.metaDescEn || "",
      metaDescKh: article.metaDescKh || "",
      status: article.status,
      sortOrder: article.sortOrder,
      isFeatured: article.isFeatured,
    })
    setIsArticleDialogOpen(true)
  }

  const handleArticleSubmit = async () => {
    try {
      const data = {
        categoryId: articleForm.categoryId,
        titleEn: articleForm.titleEn,
        titleKh: articleForm.titleKh,
        slug: articleForm.slug || generateSlug(articleForm.titleEn),
        contentEn: articleForm.contentEn,
        contentKh: articleForm.contentKh,
        metaTitleEn: articleForm.metaTitleEn || undefined,
        metaTitleKh: articleForm.metaTitleKh || undefined,
        metaDescEn: articleForm.metaDescEn || undefined,
        metaDescKh: articleForm.metaDescKh || undefined,
        status: articleForm.status,
        sortOrder: articleForm.sortOrder,
        isFeatured: articleForm.isFeatured,
      }

      if (editingArticle) {
        await updateArticleMutation.mutateAsync({ id: editingArticle.id, ...data })
        toast({ title: "Article updated successfully" })
      } else {
        await createArticleMutation.mutateAsync(data)
        toast({ title: "Article created successfully" })
      }
      setIsArticleDialogOpen(false)
      resetArticleForm()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleArticleDelete = async () => {
    if (!deleteArticle) return
    try {
      await deleteArticleMutation.mutateAsync(deleteArticle.id)
      toast({ title: "Article deleted successfully" })
      setDeleteArticle(null)
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

  const getStatusVariant = (status: string): "default" | "outline" | "secondary" | "destructive" => {
    switch (status) {
      case "PUBLISHED": return "default"
      case "DRAFT": return "outline"
      case "ARCHIVED": return "secondary"
      default: return "secondary"
    }
  }

  if (categoriesLoading || articlesLoading) {
    return (
      <AdminLoading
        title="Help Center"
        subtitle="Manage FAQ articles and help categories"
        rows={4}
      />
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
          <p className="text-muted-foreground mt-1">
            Manage FAQ articles and help documentation
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          <TabsTrigger
            value="articles"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"
          >
            <FileText size={16} />
            Articles
            <Badge variant="secondary" className="ml-1 rounded-full px-2 py-0 text-xs">
              {articles.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"
          >
            <FolderOpen size={16} />
            Categories
            <Badge variant="secondary" className="ml-1 rounded-full px-2 py-0 text-xs">
              {categories.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Articles Tab */}
        <TabsContent value="articles" className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v as HelpArticleStatus)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreateArticleDialog} size="sm" className="h-9">
              <Plus size={16} className="mr-2" />
              Add Article
            </Button>
          </div>

          {/* Articles Table */}
          <Card>
            <div className="rounded-md">
              {articles.length > 0 ? (
                <AdminTable>
                  <AdminTableHeader>
                    <AdminTableHeadRow>
                      <AdminTableHead>Title</AdminTableHead>
                      <AdminTableHead>Category</AdminTableHead>
                      <AdminTableHead>Status</AdminTableHead>
                      <AdminTableHead>Views</AdminTableHead>
                      <AdminTableHead>Helpful</AdminTableHead>
                      <AdminTableHead>Updated</AdminTableHead>
                      <AdminTableHead className="text-right">Actions</AdminTableHead>
                    </AdminTableHeadRow>
                  </AdminTableHeader>
                  <AdminTableBody>
                    {articles.map((article) => (
                      <AdminTableRow key={article.id}>
                        <AdminTableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                              <FileText size={18} className="text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{article.titleEn}</span>
                                {article.isFeatured && (
                                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{article.titleKh}</p>
                            </div>
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <span className="text-sm">{article.category?.nameEn || "-"}</span>
                        </AdminTableCell>
                        <AdminTableCell>
                          <AdminBadge variant={getStatusVariant(article.status)}>
                            {article.status}
                          </AdminBadge>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <TrendingUp size={14} className="text-muted-foreground" />
                            <span>{article.viewCount}</span>
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-green-600 font-medium">{article.helpfulYes}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-red-600 font-medium">{article.helpfulNo}</span>
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <span className="text-sm text-muted-foreground">{formatDate(article.updatedAt)}</span>
                        </AdminTableCell>
                        <AdminTableCell className="text-right">
                          <AdminActionButtons>
                            {article.status === "PUBLISHED" && (
                              <AdminViewButton onClick={() => window.open(`/help/${article.slug}`, "_blank")} />
                            )}
                            <AdminEditButton onClick={() => openEditArticleDialog(article)} />
                            <AdminDeleteButton onClick={() => setDeleteArticle(article)} />
                          </AdminActionButtons>
                        </AdminTableCell>
                      </AdminTableRow>
                    ))}
                  </AdminTableBody>
                </AdminTable>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                    <FileText size={24} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No articles yet</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Get started by creating your first help article.
                  </p>
                  <Button onClick={openCreateArticleDialog} size="sm">
                    <Plus size={16} className="mr-2" />
                    Create Article
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Organize your articles into categories for better navigation.
            </p>
            <Button onClick={openCreateCategoryDialog} size="sm" className="h-9">
              <Plus size={16} className="mr-2" />
              Add Category
            </Button>
          </div>

          {/* Categories Table */}
          <Card>
            <div className="rounded-md">
              {categories.length > 0 ? (
                <AdminTable>
                  <AdminTableHeader>
                    <AdminTableHeadRow>
                      <AdminTableHead>Category</AdminTableHead>
                      <AdminTableHead>Slug</AdminTableHead>
                      <AdminTableHead>Articles</AdminTableHead>
                      <AdminTableHead>Order</AdminTableHead>
                      <AdminTableHead>Status</AdminTableHead>
                      <AdminTableHead className="text-right">Actions</AdminTableHead>
                    </AdminTableHeadRow>
                  </AdminTableHeader>
                  <AdminTableBody>
                    {categories.map((category) => (
                      <AdminTableRow key={category.id}>
                        <AdminTableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                              <FolderOpen size={18} className="text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                              <span className="font-medium">{category.nameEn}</span>
                              <p className="text-xs text-muted-foreground">{category.nameKh}</p>
                            </div>
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">/{category.slug}</code>
                        </AdminTableCell>
                        <AdminTableCell>
                          <Badge variant="secondary" className="rounded-full">
                            {category._count?.articles || 0} articles
                          </Badge>
                        </AdminTableCell>
                        <AdminTableCell>
                          <span className="text-sm">{category.sortOrder}</span>
                        </AdminTableCell>
                        <AdminTableCell>
                          <AdminBadge variant={category.isActive ? "default" : "secondary"}>
                            {category.isActive ? "Active" : "Inactive"}
                          </AdminBadge>
                        </AdminTableCell>
                        <AdminTableCell className="text-right">
                          <AdminActionButtons>
                            <AdminEditButton onClick={() => openEditCategoryDialog(category)} />
                            <AdminDeleteButton onClick={() => setDeleteCategory(category)} />
                          </AdminActionButtons>
                        </AdminTableCell>
                      </AdminTableRow>
                    ))}
                  </AdminTableBody>
                </AdminTable>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                    <FolderOpen size={24} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No categories yet</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Create categories to organize your help articles.
                  </p>
                  <Button onClick={openCreateCategoryDialog} size="sm">
                    <Plus size={16} className="mr-2" />
                    Create Category
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="catNameEn">Name (English)</Label>
                <Input
                  id="catNameEn"
                  value={categoryForm.nameEn}
                  onChange={(e) => {
                    setCategoryForm({
                      ...categoryForm,
                      nameEn: e.target.value,
                      slug: categoryForm.slug || generateSlug(e.target.value),
                    })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="catNameKh">Name (Khmer)</Label>
                <Input
                  id="catNameKh"
                  value={categoryForm.nameKh}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameKh: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="catSlug">URL Slug</Label>
              <Input
                id="catSlug"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                placeholder="auto-generated-from-name"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catDesc">Description</Label>
              <Textarea
                id="catDesc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Optional category description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="catIcon">Icon Name (Lucide)</Label>
                <Input
                  id="catIcon"
                  value={categoryForm.iconName}
                  onChange={(e) => setCategoryForm({ ...categoryForm, iconName: e.target.value })}
                  placeholder="e.g., HelpCircle"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="catOrder">Sort Order</Label>
                <Input
                  id="catOrder"
                  type="number"
                  value={categoryForm.sortOrder}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="catActive"
                checked={categoryForm.isActive}
                onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
              />
              <Label htmlFor="catActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCategorySubmit}
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending || updateCategoryMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article Dialog */}
      <Dialog open={isArticleDialogOpen} onOpenChange={setIsArticleDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle ? "Edit Article" : "Add New Article"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="artCategory">Category</Label>
                <Select value={articleForm.categoryId} onValueChange={(v) => setArticleForm({ ...articleForm, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="artStatus">Status</Label>
                <Select value={articleForm.status} onValueChange={(v) => setArticleForm({ ...articleForm, status: v as HelpArticleStatus })}>
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
                <Label htmlFor="artTitleEn">Title (English)</Label>
                <Input
                  id="artTitleEn"
                  value={articleForm.titleEn}
                  onChange={(e) => {
                    setArticleForm({
                      ...articleForm,
                      titleEn: e.target.value,
                      slug: articleForm.slug || generateSlug(e.target.value),
                    })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artTitleKh">Title (Khmer)</Label>
                <Input
                  id="artTitleKh"
                  value={articleForm.titleKh}
                  onChange={(e) => setArticleForm({ ...articleForm, titleKh: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="artSlug">URL Slug</Label>
              <Input
                id="artSlug"
                value={articleForm.slug}
                onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })}
                placeholder="auto-generated-from-title"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artContentEn">Content (English)</Label>
              <Textarea
                id="artContentEn"
                value={articleForm.contentEn}
                onChange={(e) => setArticleForm({ ...articleForm, contentEn: e.target.value })}
                className="min-h-[150px]"
                placeholder="Article content in English (supports Markdown)..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artContentKh">Content (Khmer)</Label>
              <Textarea
                id="artContentKh"
                value={articleForm.contentKh}
                onChange={(e) => setArticleForm({ ...articleForm, contentKh: e.target.value })}
                className="min-h-[150px]"
                placeholder="Article content in Khmer (supports Markdown)..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="artOrder">Sort Order</Label>
                <Input
                  id="artOrder"
                  type="number"
                  value={articleForm.sortOrder}
                  onChange={(e) => setArticleForm({ ...articleForm, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="artFeatured"
                  checked={articleForm.isFeatured}
                  onCheckedChange={(checked) => setArticleForm({ ...articleForm, isFeatured: checked })}
                />
                <Label htmlFor="artFeatured">Featured Article</Label>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">SEO Settings (Optional)</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="artMetaTitleEn">Meta Title (EN)</Label>
                    <Input
                      id="artMetaTitleEn"
                      value={articleForm.metaTitleEn}
                      onChange={(e) => setArticleForm({ ...articleForm, metaTitleEn: e.target.value })}
                      placeholder="Defaults to title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="artMetaTitleKh">Meta Title (KH)</Label>
                    <Input
                      id="artMetaTitleKh"
                      value={articleForm.metaTitleKh}
                      onChange={(e) => setArticleForm({ ...articleForm, metaTitleKh: e.target.value })}
                      placeholder="Defaults to title"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="artMetaDescEn">Meta Description (EN)</Label>
                    <Textarea
                      id="artMetaDescEn"
                      value={articleForm.metaDescEn}
                      onChange={(e) => setArticleForm({ ...articleForm, metaDescEn: e.target.value })}
                      className="min-h-[60px]"
                      placeholder="SEO description..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="artMetaDescKh">Meta Description (KH)</Label>
                    <Textarea
                      id="artMetaDescKh"
                      value={articleForm.metaDescKh}
                      onChange={(e) => setArticleForm({ ...articleForm, metaDescKh: e.target.value })}
                      className="min-h-[60px]"
                      placeholder="SEO description..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArticleDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleArticleSubmit}
              disabled={createArticleMutation.isPending || updateArticleMutation.isPending}
            >
              {createArticleMutation.isPending || updateArticleMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Delete Confirmation */}
      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteCategory?.nameEn}&quot;? This will also delete all articles in this category. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCategoryDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategoryMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Article Delete Confirmation */}
      <AlertDialog open={!!deleteArticle} onOpenChange={() => setDeleteArticle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteArticle?.titleEn}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArticleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteArticleMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
