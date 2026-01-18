"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Plus,
  Search,
  Tag,
  FolderOpen,
  FileText,
  Clock,
  User,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Link as LinkIcon,
  Package,
} from "lucide-react"
import {
  useBlogPosts,
  useCreateBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
  useBlogCategories,
  useCreateBlogCategory,
  useUpdateBlogCategory,
  useDeleteBlogCategory,
  useBlogTags,
  useCreateBlogTag,
  useDeleteBlogTag,
  useUsers,
  useProducts,
  BlogPost,
  BlogCategory,
  BlogTag,
  BlogPostStatus,
  BlogPostInput,
} from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import { RichTextEditor } from "@/components/rich-text-editor"
import { translations } from "@/lib/i18n"
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

type Language = "EN" | "KH"

const statusOptions: BlogPostStatus[] = ["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]

interface BlogPageProps {
  language?: Language
}

export function BlogPage({ language = "EN" }: BlogPageProps) {
  const t = translations[language === "EN" ? "en" : "kh"]
  const { toast } = useToast()

  // Active tab
  const [activeTab, setActiveTab] = useState<"posts" | "categories" | "tags">("posts")

  // Filters
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | "">("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)

  // Dialogs
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [deletePost, setDeletePost] = useState<BlogPost | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<BlogCategory | null>(null)
  const [deleteTag, setDeleteTag] = useState<BlogTag | null>(null)

  // Editing state
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null)

  // Form data
  const [postForm, setPostForm] = useState<Partial<BlogPostInput>>({
    titleEn: "",
    titleKh: "",
    contentEn: "",
    contentKh: "",
    excerptEn: "",
    excerptKh: "",
    authorId: "",
    status: "DRAFT",
    categoryId: "",
    featuredImage: "",
    featuredImageAlt: "",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    canonicalUrl: "",
    ogImage: "",
    tagIds: [],
    relatedProductIds: [],
  })

  const [categoryForm, setCategoryForm] = useState({
    nameEn: "",
    nameKh: "",
    descriptionEn: "",
    descriptionKh: "",
    slug: "",
    metaTitle: "",
    metaDescription: "",
    sortOrder: 0,
    isActive: true,
  })

  const [tagForm, setTagForm] = useState({
    nameEn: "",
    nameKh: "",
  })

  // Data fetching
  const { data: postsData, isLoading: postsLoading } = useBlogPosts({
    status: statusFilter || undefined,
    categoryId: categoryFilter || undefined,
    search: searchQuery || undefined,
    page,
    limit: 10,
    includeRelated: true,
  })

  const { data: categoriesData, isLoading: categoriesLoading } = useBlogCategories({
    includeCount: true,
  })

  const { data: tagsData, isLoading: tagsLoading } = useBlogTags({ popular: true })
  const { data: usersData } = useUsers()
  const { data: productsData } = useProducts()

  // Mutations
  const createPost = useCreateBlogPost()
  const updatePost = useUpdateBlogPost()
  const deletePostMutation = useDeleteBlogPost()
  const createCategory = useCreateBlogCategory()
  const updateCategory = useUpdateBlogCategory()
  const deleteCategoryMutation = useDeleteBlogCategory()
  const createTag = useCreateBlogTag()
  const deleteTagMutation = useDeleteBlogTag()

  const posts = postsData?.posts || []
  const pagination = postsData?.pagination
  const categories = categoriesData?.categories || []
  const tags = tagsData?.tags || []
  const users = usersData?.users || []
  const products = productsData?.products || []

  // Reset form
  const resetPostForm = () => {
    setPostForm({
      titleEn: "",
      titleKh: "",
      contentEn: "",
      contentKh: "",
      excerptEn: "",
      excerptKh: "",
      authorId: users[0]?.id || "",
      status: "DRAFT",
      categoryId: "",
      featuredImage: "",
      featuredImageAlt: "",
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      canonicalUrl: "",
      ogImage: "",
      tagIds: [],
      relatedProductIds: [],
    })
    setEditingPost(null)
  }

  const resetCategoryForm = () => {
    setCategoryForm({
      nameEn: "",
      nameKh: "",
      descriptionEn: "",
      descriptionKh: "",
      slug: "",
      metaTitle: "",
      metaDescription: "",
      sortOrder: 0,
      isActive: true,
    })
    setEditingCategory(null)
  }

  const resetTagForm = () => {
    setTagForm({ nameEn: "", nameKh: "" })
  }

  // Open dialogs
  const openCreatePostDialog = () => {
    resetPostForm()
    setIsPostDialogOpen(true)
  }

  const openEditPostDialog = (post: BlogPost) => {
    setEditingPost(post)
    setPostForm({
      titleEn: post.titleEn,
      titleKh: post.titleKh,
      contentEn: post.contentEn,
      contentKh: post.contentKh,
      excerptEn: post.excerptEn || "",
      excerptKh: post.excerptKh || "",
      authorId: post.authorId,
      status: post.status,
      categoryId: post.categoryId || "",
      featuredImage: post.featuredImage || "",
      featuredImageAlt: post.featuredImageAlt || "",
      metaTitle: post.metaTitle || "",
      metaDescription: post.metaDescription || "",
      metaKeywords: post.metaKeywords || "",
      canonicalUrl: post.canonicalUrl || "",
      ogImage: post.ogImage || "",
      tagIds: post.tags.map(t => t.id),
      relatedProductIds: post.relatedProducts?.map(p => p.id) || [],
    })
    setIsPostDialogOpen(true)
  }

  const openCreateCategoryDialog = () => {
    resetCategoryForm()
    setIsCategoryDialogOpen(true)
  }

  const openEditCategoryDialog = (category: BlogCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      nameEn: category.nameEn,
      nameKh: category.nameKh,
      descriptionEn: category.descriptionEn || "",
      descriptionKh: category.descriptionKh || "",
      slug: category.slug,
      metaTitle: category.metaTitle || "",
      metaDescription: category.metaDescription || "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    })
    setIsCategoryDialogOpen(true)
  }

  // Handlers
  const handlePostSubmit = async () => {
    try {
      if (!postForm.titleEn || !postForm.titleKh || !postForm.contentEn || !postForm.contentKh) {
        toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" })
        return
      }

      if (!postForm.authorId) {
        toast({ title: "Error", description: "Please select an author", variant: "destructive" })
        return
      }

      const data: BlogPostInput = {
        titleEn: postForm.titleEn,
        titleKh: postForm.titleKh,
        contentEn: postForm.contentEn,
        contentKh: postForm.contentKh,
        excerptEn: postForm.excerptEn || undefined,
        excerptKh: postForm.excerptKh || undefined,
        authorId: postForm.authorId,
        status: postForm.status || "DRAFT",
        categoryId: postForm.categoryId || undefined,
        featuredImage: postForm.featuredImage || undefined,
        featuredImageAlt: postForm.featuredImageAlt || undefined,
        metaTitle: postForm.metaTitle || undefined,
        metaDescription: postForm.metaDescription || undefined,
        metaKeywords: postForm.metaKeywords || undefined,
        canonicalUrl: postForm.canonicalUrl || undefined,
        ogImage: postForm.ogImage || undefined,
        tagIds: postForm.tagIds?.length ? postForm.tagIds : undefined,
        relatedProductIds: postForm.relatedProductIds?.length ? postForm.relatedProductIds : undefined,
      }

      if (editingPost) {
        await updatePost.mutateAsync({ id: editingPost.id, ...data })
        toast({ title: "Post updated successfully" })
      } else {
        await createPost.mutateAsync(data)
        toast({ title: "Post created successfully" })
      }
      setIsPostDialogOpen(false)
      resetPostForm()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleCategorySubmit = async () => {
    try {
      if (!categoryForm.nameEn || !categoryForm.nameKh) {
        toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" })
        return
      }

      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, ...categoryForm })
        toast({ title: "Category updated successfully" })
      } else {
        await createCategory.mutateAsync(categoryForm)
        toast({ title: "Category created successfully" })
      }
      setIsCategoryDialogOpen(false)
      resetCategoryForm()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleTagSubmit = async () => {
    try {
      if (!tagForm.nameEn || !tagForm.nameKh) {
        toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" })
        return
      }

      await createTag.mutateAsync(tagForm)
      toast({ title: "Tag created successfully" })
      setIsTagDialogOpen(false)
      resetTagForm()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleDeletePost = async () => {
    if (!deletePost) return
    try {
      await deletePostMutation.mutateAsync(deletePost.id)
      toast({ title: "Post deleted successfully" })
      setDeletePost(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteCategory) return
    try {
      await deleteCategoryMutation.mutateAsync(deleteCategory.id)
      toast({ title: "Category deleted successfully" })
      setDeleteCategory(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleDeleteTag = async () => {
    if (!deleteTag) return
    try {
      await deleteTagMutation.mutateAsync(deleteTag.id)
      toast({ title: "Tag deleted successfully" })
      setDeleteTag(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  // Helpers
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusVariant = (status: BlogPostStatus): "default" | "secondary" | "outline" | "destructive" => {
    const variants: Record<BlogPostStatus, "default" | "secondary" | "outline" | "destructive"> = {
      PUBLISHED: "default",
      DRAFT: "secondary",
      SCHEDULED: "outline",
      ARCHIVED: "destructive",
    }
    return variants[status]
  }

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    setPostForm(prev => ({
      ...prev,
      tagIds: prev.tagIds?.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...(prev.tagIds || []), tagId]
    }))
  }

  // Toggle product selection
  const toggleProduct = (productId: string) => {
    setPostForm(prev => ({
      ...prev,
      relatedProductIds: prev.relatedProductIds?.includes(productId)
        ? prev.relatedProductIds.filter(id => id !== productId)
        : [...(prev.relatedProductIds || []), productId]
    }))
  }

  // Loading state
  if (postsLoading && activeTab === "posts") {
    return (
      <AdminLoading
        title={t.blog?.title || "Blog"}
        subtitle={t.blog?.description || "Manage blog posts, categories, and tags"}
        rows={3}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title={t.blog?.title || "Blog"}
        subtitle={t.blog?.description || "Manage blog posts, categories, and tags"}
      >
        {activeTab === "posts" && (
          <Button onClick={openCreatePostDialog} className="flex items-center gap-2">
            <Plus size={16} /> {t.blog?.newPost || "New Post"}
          </Button>
        )}
        {activeTab === "categories" && (
          <Button onClick={openCreateCategoryDialog} className="flex items-center gap-2">
            <Plus size={16} /> {t.blog?.newCategory || "New Category"}
          </Button>
        )}
        {activeTab === "tags" && (
          <Button onClick={() => setIsTagDialogOpen(true)} className="flex items-center gap-2">
            <Plus size={16} /> {t.blog?.newTag || "New Tag"}
          </Button>
        )}
      </AdminPageHeader>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="posts" className="gap-2">
            <FileText size={14} /> {t.blog?.posts || "Posts"} ({pagination?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderOpen size={14} /> {t.blog?.categories || "Categories"} ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Tag size={14} /> {t.blog?.tags || "Tags"} ({tags.length})
          </TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          {/* Filters */}
          <AdminFilterCard>
            <div className="flex-1 min-w-[200px] max-w-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder={t.blog?.searchPosts || "Search posts..."}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => {
              setStatusFilter(v === "all" ? "" : v as BlogPostStatus)
              setPage(1)
            }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t.blog?.allStatuses || "All Statuses"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.blog?.allStatuses || "All Statuses"}</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter || "all"} onValueChange={(v) => {
              setCategoryFilter(v === "all" ? "" : v)
              setPage(1)
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t.blog?.allCategories || "All Categories"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.blog?.allCategories || "All Categories"}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{language === "EN" ? c.nameEn : c.nameKh}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AdminFilterCard>

          {/* Posts Table */}
          <AdminDataCard>
            {posts.length > 0 ? (
              <>
                <AdminTable>
                  <AdminTableHeader>
                    <AdminTableHeadRow>
                      <AdminTableHead>{t.blog?.titleColumn || "Title"}</AdminTableHead>
                      <AdminTableHead>{t.blog?.authorColumn || "Author"}</AdminTableHead>
                      <AdminTableHead>{t.blog?.categoryColumn || "Category"}</AdminTableHead>
                      <AdminTableHead>{t.blog?.statusColumn || "Status"}</AdminTableHead>
                      <AdminTableHead>{t.blog?.dateColumn || "Date"}</AdminTableHead>
                      <AdminTableHead>{t.blog?.actionsColumn || "Actions"}</AdminTableHead>
                    </AdminTableHeadRow>
                  </AdminTableHeader>
                  <AdminTableBody>
                    {posts.map((post) => (
                      <AdminTableRow key={post.id}>
                        <AdminTableCell>
                          <div className="flex items-start gap-3">
                            {post.featuredImage && (
                              <img
                                src={post.featuredImage}
                                alt={post.featuredImageAlt || ""}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div>
                              <p className="font-medium">{language === "EN" ? post.titleEn : post.titleKh}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock size={10} /> {post.readingTimeMin || 1} min read
                              </p>
                            </div>
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-muted-foreground" />
                            {post.author.name}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          {post.category ? (
                            <AdminBadge variant="outline">
                              {language === "EN" ? post.category.nameEn : post.category.nameKh}
                            </AdminBadge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </AdminTableCell>
                        <AdminTableCell>
                          <AdminBadge variant={getStatusVariant(post.status)}>
                            {post.status}
                          </AdminBadge>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="text-sm">
                            {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <AdminActionButtons>
                            {post.status === "PUBLISHED" && (
                              <AdminViewButton onClick={() => window.open(`/blog/${post.slug}`, "_blank")} />
                            )}
                            <AdminEditButton onClick={() => openEditPostDialog(post)} />
                            <AdminDeleteButton onClick={() => setDeletePost(post)} />
                          </AdminActionButtons>
                        </AdminTableCell>
                      </AdminTableRow>
                    ))}
                  </AdminTableBody>
                </AdminTable>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      {t.blog?.showing || "Showing"} {(page - 1) * 10 + 1} - {Math.min(page * 10, pagination.total)} {t.blog?.of || "of"} {pagination.total}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                      >
                        <ChevronLeft size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= pagination.totalPages}
                        onClick={() => setPage(p => p + 1)}
                      >
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <AdminEmptyState message={t.blog?.noPosts || "No posts found. Create your first blog post!"} />
            )}
          </AdminDataCard>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <AdminDataCard>
            {categoriesLoading ? (
              <AdminLoading
                title={t.blog?.categories || "Categories"}
                rows={3}
              />
            ) : categories.length > 0 ? (
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableHeadRow>
                    <AdminTableHead>{t.blog?.nameColumn || "Name"}</AdminTableHead>
                    <AdminTableHead>{t.blog?.slugColumn || "Slug"}</AdminTableHead>
                    <AdminTableHead>{t.blog?.postsColumn || "Posts"}</AdminTableHead>
                    <AdminTableHead>{t.blog?.statusColumn || "Status"}</AdminTableHead>
                    <AdminTableHead>{t.blog?.actionsColumn || "Actions"}</AdminTableHead>
                  </AdminTableHeadRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {categories.map((category) => (
                    <AdminTableRow key={category.id}>
                      <AdminTableCell>
                        <div>
                          <p className="font-medium">{language === "EN" ? category.nameEn : category.nameKh}</p>
                          <p className="text-xs text-muted-foreground">{language === "KH" ? category.nameEn : category.nameKh}</p>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className="font-mono text-sm">{category.slug}</AdminTableCell>
                      <AdminTableCell>{category._count?.posts || 0}</AdminTableCell>
                      <AdminTableCell>
                        <AdminBadge variant={category.isActive ? "default" : "secondary"}>
                          {category.isActive ? "Active" : "Inactive"}
                        </AdminBadge>
                      </AdminTableCell>
                      <AdminTableCell>
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
              <AdminEmptyState message={t.blog?.noCategories || "No categories found. Create your first category!"} />
            )}
          </AdminDataCard>
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="space-y-4">
          <Card className="p-6">
            {tagsLoading ? (
              <AdminLoading
                title={t.blog?.tags || "Tags"}
                rows={3}
              />
            ) : tags.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                  >
                    <Tag size={14} className="text-muted-foreground" />
                    <div>
                      <p className="font-medium">{language === "EN" ? tag.nameEn : tag.nameKh}</p>
                      <p className="text-xs text-muted-foreground">{tag.postCount} posts</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTag(tag)}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <AdminEmptyState message={t.blog?.noTags || "No tags found. Create your first tag!"} />
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Post Dialog */}
      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? (t.blog?.editPost || "Edit Post") : (t.blog?.newPost || "New Post")}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="content">{t.blog?.contentTab || "Content"}</TabsTrigger>
                <TabsTrigger value="media">{t.blog?.mediaTab || "Media"}</TabsTrigger>
                <TabsTrigger value="seo">{t.blog?.seoTab || "SEO"}</TabsTrigger>
                <TabsTrigger value="related">{t.blog?.relatedTab || "Related"}</TabsTrigger>
              </TabsList>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.blog?.titleEn || "Title (English)"} *</Label>
                    <Input
                      value={postForm.titleEn}
                      onChange={(e) => setPostForm({ ...postForm, titleEn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.blog?.titleKh || "Title (Khmer)"} *</Label>
                    <Input
                      value={postForm.titleKh}
                      onChange={(e) => setPostForm({ ...postForm, titleKh: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t.blog?.contentEn || "Content (English)"} *</Label>
                  <RichTextEditor
                    value={postForm.contentEn || ""}
                    onChange={(v) => setPostForm({ ...postForm, contentEn: v })}
                    minHeight="200px"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.blog?.contentKh || "Content (Khmer)"} *</Label>
                  <RichTextEditor
                    value={postForm.contentKh || ""}
                    onChange={(v) => setPostForm({ ...postForm, contentKh: v })}
                    minHeight="200px"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.blog?.excerptEn || "Excerpt (English)"}</Label>
                    <Textarea
                      value={postForm.excerptEn}
                      onChange={(e) => setPostForm({ ...postForm, excerptEn: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.blog?.excerptKh || "Excerpt (Khmer)"}</Label>
                    <Textarea
                      value={postForm.excerptKh}
                      onChange={(e) => setPostForm({ ...postForm, excerptKh: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t.blog?.author || "Author"} *</Label>
                    <Select
                      value={postForm.authorId}
                      onValueChange={(v) => setPostForm({ ...postForm, authorId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.blog?.selectAuthor || "Select author"} />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.blog?.category || "Category"}</Label>
                    <Select
                      value={postForm.categoryId || "none"}
                      onValueChange={(v) => setPostForm({ ...postForm, categoryId: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.blog?.selectCategory || "Select category"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t.blog?.noCategory || "No category"}</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {language === "EN" ? cat.nameEn : cat.nameKh}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.blog?.status || "Status"}</Label>
                    <Select
                      value={postForm.status}
                      onValueChange={(v) => setPostForm({ ...postForm, status: v as BlogPostStatus })}
                    >
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

                {/* Tags */}
                <div className="space-y-2">
                  <Label>{t.blog?.tags || "Tags"}</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Button
                        key={tag.id}
                        type="button"
                        variant={postForm.tagIds?.includes(tag.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleTag(tag.id)}
                      >
                        <Tag size={12} className="mr-1" />
                        {language === "EN" ? tag.nameEn : tag.nameKh}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{t.blog?.featuredImage || "Featured Image URL"}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={postForm.featuredImage}
                      onChange={(e) => setPostForm({ ...postForm, featuredImage: e.target.value })}
                      placeholder="https://..."
                    />
                    <Button variant="outline" type="button">
                      <ImageIcon size={14} />
                    </Button>
                  </div>
                  {postForm.featuredImage && (
                    <img
                      src={postForm.featuredImage}
                      alt="Featured preview"
                      className="w-full max-w-md h-48 object-cover rounded-lg mt-2"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t.blog?.imageAlt || "Image Alt Text"}</Label>
                  <Input
                    value={postForm.featuredImageAlt}
                    onChange={(e) => setPostForm({ ...postForm, featuredImageAlt: e.target.value })}
                    placeholder="Describe the image for accessibility"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.blog?.ogImage || "Open Graph Image URL"}</Label>
                  <Input
                    value={postForm.ogImage}
                    onChange={(e) => setPostForm({ ...postForm, ogImage: e.target.value })}
                    placeholder="Social sharing image (defaults to featured image)"
                  />
                </div>
              </TabsContent>

              {/* SEO Tab */}
              <TabsContent value="seo" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{t.blog?.metaTitle || "Meta Title"}</Label>
                  <Input
                    value={postForm.metaTitle}
                    onChange={(e) => setPostForm({ ...postForm, metaTitle: e.target.value })}
                    placeholder="SEO title (defaults to post title)"
                  />
                  <p className="text-xs text-muted-foreground">
                    {(postForm.metaTitle?.length || 0)}/60 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t.blog?.metaDescription || "Meta Description"}</Label>
                  <Textarea
                    value={postForm.metaDescription}
                    onChange={(e) => setPostForm({ ...postForm, metaDescription: e.target.value })}
                    placeholder="SEO description for search engines"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {(postForm.metaDescription?.length || 0)}/160 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t.blog?.metaKeywords || "Meta Keywords"}</Label>
                  <Input
                    value={postForm.metaKeywords}
                    onChange={(e) => setPostForm({ ...postForm, metaKeywords: e.target.value })}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.blog?.canonicalUrl || "Canonical URL"}</Label>
                  <div className="flex items-center gap-2">
                    <LinkIcon size={14} className="text-muted-foreground" />
                    <Input
                      value={postForm.canonicalUrl}
                      onChange={(e) => setPostForm({ ...postForm, canonicalUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Related Products Tab */}
              <TabsContent value="related" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Package size={14} />
                    {t.blog?.relatedProducts || "Related Products"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t.blog?.relatedProductsHint || "Select products to feature in this post"}
                  </p>
                  <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto border rounded-lg p-2">
                    {products.map((product) => (
                      <Button
                        key={product.id}
                        type="button"
                        variant={postForm.relatedProductIds?.includes(product.id) ? "default" : "outline"}
                        size="sm"
                        className="justify-start h-auto py-2"
                        onClick={() => toggleProduct(product.id)}
                      >
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt="" className="w-8 h-8 object-cover rounded mr-2" />
                        )}
                        <span className="truncate text-xs">
                          {language === "EN" ? product.nameEn : product.nameKh}
                        </span>
                      </Button>
                    ))}
                  </div>
                  {postForm.relatedProductIds && postForm.relatedProductIds.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {postForm.relatedProductIds.length} {t.blog?.productsSelected || "products selected"}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsPostDialogOpen(false)}>
              {t.blog?.cancel || "Cancel"}
            </Button>
            <Button
              onClick={handlePostSubmit}
              disabled={createPost.isPending || updatePost.isPending}
            >
              {createPost.isPending || updatePost.isPending
                ? (t.blog?.saving || "Saving...")
                : (t.blog?.save || "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? (t.blog?.editCategory || "Edit Category") : (t.blog?.newCategory || "New Category")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.blog?.nameEn || "Name (English)"} *</Label>
                <Input
                  value={categoryForm.nameEn}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.blog?.nameKh || "Name (Khmer)"} *</Label>
                <Input
                  value={categoryForm.nameKh}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameKh: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.blog?.slug || "Slug"}</Label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                placeholder="auto-generated-from-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.blog?.descriptionEn || "Description (EN)"}</Label>
                <Textarea
                  value={categoryForm.descriptionEn}
                  onChange={(e) => setCategoryForm({ ...categoryForm, descriptionEn: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.blog?.descriptionKh || "Description (KH)"}</Label>
                <Textarea
                  value={categoryForm.descriptionKh}
                  onChange={(e) => setCategoryForm({ ...categoryForm, descriptionKh: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label>{t.blog?.sortOrder || "Sort Order"}</Label>
                <Input
                  type="number"
                  value={categoryForm.sortOrder}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-24"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={categoryForm.isActive}
                  onCheckedChange={(v) => setCategoryForm({ ...categoryForm, isActive: v })}
                />
                <Label>{t.blog?.active || "Active"}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              {t.blog?.cancel || "Cancel"}
            </Button>
            <Button
              onClick={handleCategorySubmit}
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              {createCategory.isPending || updateCategory.isPending
                ? (t.blog?.saving || "Saving...")
                : (t.blog?.save || "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.blog?.newTag || "New Tag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.blog?.nameEn || "Name (English)"} *</Label>
              <Input
                value={tagForm.nameEn}
                onChange={(e) => setTagForm({ ...tagForm, nameEn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.blog?.nameKh || "Name (Khmer)"} *</Label>
              <Input
                value={tagForm.nameKh}
                onChange={(e) => setTagForm({ ...tagForm, nameKh: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTagDialogOpen(false)}>
              {t.blog?.cancel || "Cancel"}
            </Button>
            <Button onClick={handleTagSubmit} disabled={createTag.isPending}>
              {createTag.isPending ? (t.blog?.saving || "Saving...") : (t.blog?.save || "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmations */}
      <AlertDialog open={!!deletePost} onOpenChange={() => setDeletePost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.blog?.deletePost || "Delete Post"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.blog?.deletePostConfirm || "Are you sure you want to delete"} &quot;{deletePost?.titleEn}&quot;? {t.blog?.cannotUndo || "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.blog?.cancel || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePostMutation.isPending ? (t.blog?.deleting || "Deleting...") : (t.blog?.delete || "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.blog?.deleteCategory || "Delete Category"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.blog?.deleteCategoryConfirm || "Are you sure you want to delete"} &quot;{deleteCategory?.nameEn}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.blog?.cancel || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategoryMutation.isPending ? (t.blog?.deleting || "Deleting...") : (t.blog?.delete || "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTag} onOpenChange={() => setDeleteTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.blog?.deleteTag || "Delete Tag"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.blog?.deleteTagConfirm || "Are you sure you want to delete"} &quot;{deleteTag?.nameEn}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.blog?.cancel || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTagMutation.isPending ? (t.blog?.deleting || "Deleting...") : (t.blog?.delete || "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
