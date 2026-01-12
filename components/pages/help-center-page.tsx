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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash, Eye, FolderOpen, FileText, Star, TrendingUp } from "lucide-react"
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "default"
      case "DRAFT": return "secondary"
      case "ARCHIVED": return "outline"
      default: return "secondary"
    }
  }

  if (categoriesLoading || articlesLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Help Center</h1>
            <p className="text-muted-foreground mt-2">Manage FAQ articles and help categories</p>
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
          <h1 className="text-3xl font-bold text-foreground">Help Center</h1>
          <p className="text-muted-foreground mt-2">Manage FAQ articles and help categories</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <FileText size={16} /> Articles
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen size={16} /> Categories
          </TabsTrigger>
        </TabsList>

        {/* Articles Tab */}
        <TabsContent value="articles" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v as HelpArticleStatus)}>
                <SelectTrigger className="w-[150px]">
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
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                {articles.length} articles
              </div>
            </div>
            <Button onClick={openCreateArticleDialog} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus size={16} /> Add Article
            </Button>
          </div>

          <Card className="p-6">
            <div className="overflow-x-auto">
              {articles.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border">
                      <TableHead className="text-foreground font-semibold">Title</TableHead>
                      <TableHead className="text-foreground font-semibold">Category</TableHead>
                      <TableHead className="text-foreground font-semibold">Status</TableHead>
                      <TableHead className="text-foreground font-semibold">Views</TableHead>
                      <TableHead className="text-foreground font-semibold">Helpful</TableHead>
                      <TableHead className="text-foreground font-semibold">Updated</TableHead>
                      <TableHead className="text-foreground font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map((article) => (
                      <TableRow key={article.id} className="border-b border-border hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {article.isFeatured && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                            <div>
                              <p className="text-foreground font-medium">{article.titleEn}</p>
                              <p className="text-sm text-muted-foreground">{article.titleKh}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground text-sm">
                          {article.category?.nameEn || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(article.status)} className="rounded-sm">
                            {article.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground text-sm">
                          <div className="flex items-center gap-1">
                            <TrendingUp size={14} className="text-muted-foreground" />
                            {article.viewCount}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground text-sm">
                          <span className="text-green-600">{article.helpfulYes}</span>
                          {" / "}
                          <span className="text-red-600">{article.helpfulNo}</span>
                        </TableCell>
                        <TableCell className="text-foreground text-sm">
                          {formatDate(article.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {article.status === "PUBLISHED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs bg-transparent"
                                onClick={() => window.open(`/help/${article.slug}`, "_blank")}
                              >
                                <Eye size={14} />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs bg-transparent"
                              onClick={() => openEditArticleDialog(article)}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-destructive hover:text-destructive bg-transparent"
                              onClick={() => setDeleteArticle(article)}
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
                  No articles found. Create your first help article!
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {categories.length} categories
            </div>
            <Button onClick={openCreateCategoryDialog} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus size={16} /> Add Category
            </Button>
          </div>

          <Card className="p-6">
            <div className="overflow-x-auto">
              {categories.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border">
                      <TableHead className="text-foreground font-semibold">Name</TableHead>
                      <TableHead className="text-foreground font-semibold">Slug</TableHead>
                      <TableHead className="text-foreground font-semibold">Articles</TableHead>
                      <TableHead className="text-foreground font-semibold">Order</TableHead>
                      <TableHead className="text-foreground font-semibold">Status</TableHead>
                      <TableHead className="text-foreground font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id} className="border-b border-border hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="text-foreground font-medium">{category.nameEn}</p>
                            <p className="text-sm text-muted-foreground">{category.nameKh}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground text-sm font-mono">
                          /{category.slug}
                        </TableCell>
                        <TableCell className="text-foreground text-sm">
                          {category._count?.articles || 0}
                        </TableCell>
                        <TableCell className="text-foreground text-sm">
                          {category.sortOrder}
                        </TableCell>
                        <TableCell>
                          <Badge variant={category.isActive ? "default" : "secondary"} className="rounded-sm">
                            {category.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs bg-transparent"
                              onClick={() => openEditCategoryDialog(category)}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-destructive hover:text-destructive bg-transparent"
                              onClick={() => setDeleteCategory(category)}
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
                  No categories found. Create your first help category!
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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
