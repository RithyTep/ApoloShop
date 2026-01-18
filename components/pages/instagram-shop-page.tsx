"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Instagram,
  Link2,
  RefreshCw,
  Image,
  ShoppingBag,
  Eye,
  MousePointer,
  Heart,
  MessageCircle,
  ExternalLink,
  Plus,
  Check,
  AlertCircle,
  Clock,
  Package,
  Users,
  DollarSign,
  Tag,
  Unlink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AdminPageHeader,
  AdminDataCard,
  AdminTable,
  AdminTableHeader,
  AdminTableHeadRow,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"

// Types
interface InstagramAccount {
  id: string
  instagramId: string
  username: string
  name: string | null
  profilePicture: string | null
  followersCount: number
  mediaCount: number
  status: "ACTIVE" | "PAUSED" | "ERROR" | "DISCONNECTED"
  lastSyncAt: string | null
  syncError: string | null
  autoSync: boolean
  connectedAt: string
  productCount: number
  postCount: number
  orderCount: number
}

interface InstagramProduct {
  id: string
  productId: string
  catalogProductId: string | null
  syncStatus: "PENDING" | "SYNCED" | "ERROR" | "REMOVED"
  lastSyncAt: string | null
  syncError: string | null
  impressions: number
  clicks: number
  saves: number
  product: {
    id: string
    nameEn: string
    nameKh: string
    priceUsd: number
    priceKhr: number
    imageUrl: string | null
    sku: string
    isActive: boolean
  }
}

interface InstagramPost {
  id: string
  mediaId: string
  mediaType: string
  mediaUrl: string
  thumbnailUrl: string | null
  permalink: string
  caption: string | null
  likeCount: number
  commentCount: number
  reach: number
  impressions: number
  productClicks: number
  conversions: number
  revenue: number
  postedAt: string
  taggedProducts: Array<{
    productId: string
    name: string
    imageUrl: string | null
    clicks: number
  }>
}

interface InstagramOrder {
  id: string
  instagramOrderId: string
  buyerName: string
  buyerEmail: string | null
  items: Array<{ productId: string; quantity: number; name?: string }>
  totalUsd: number
  totalKhr: number
  instagramStatus: string
  importStatus: "PENDING" | "IMPORTED" | "FAILED" | "SKIPPED"
  importError: string | null
  orderedAt: string
  importedAt: string | null
  linkedOrder: { id: string; orderNumber: string; status: string } | null
}

interface Analytics {
  account: {
    username: string
    followersCount: number
    mediaCount: number
    lastSyncAt: string | null
  }
  summary: {
    totalPosts: number
    totalReach: number
    totalImpressions: number
    totalEngagement: number
    avgLikes: number
    avgComments: number
    totalProductClicks: number
    totalConversions: number
    totalRevenue: number
    ordersImported: number
    orderRevenue: number
  }
  topPosts: Array<{
    id: string
    mediaType: string
    thumbnailUrl: string | null
    permalink: string
    productClicks: number
    conversions: number
    revenue: number
    postedAt: string
  }>
  topProducts: Array<{
    id: string
    name: string
    imageUrl: string | null
    price: number
    impressions: number
    clicks: number
    saves: number
  }>
}

interface ShopProduct {
  id: string
  nameEn: string
  nameKh: string
  priceUsd: number
  imageUrl: string | null
  sku: string
  isActive: boolean
}

// Status badge variant mapping
type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const statusVariants: Record<string, BadgeVariant> = {
  ACTIVE: "default",
  PAUSED: "secondary",
  ERROR: "destructive",
  DISCONNECTED: "secondary",
  PENDING: "outline",
  SYNCED: "default",
  IMPORTED: "default",
  FAILED: "destructive",
  SKIPPED: "secondary",
  REMOVED: "secondary",
}

// API hooks
function useInstagramAccounts() {
  return useQuery<{ accounts: InstagramAccount[]; total: number }>({
    queryKey: ["instagram", "accounts"],
    queryFn: async () => {
      const res = await fetch("/api/instagram?action=accounts")
      if (!res.ok) throw new Error("Failed to fetch accounts")
      return res.json()
    },
  })
}

function useInstagramProducts(accountId: string | null, page: number) {
  return useQuery<{
    products: InstagramProduct[]
    total: number
    page: number
    totalPages: number
  }>({
    queryKey: ["instagram", "products", accountId, page],
    queryFn: async () => {
      const res = await fetch(`/api/instagram?action=products&accountId=${accountId}&page=${page}`)
      if (!res.ok) throw new Error("Failed to fetch products")
      return res.json()
    },
    enabled: !!accountId,
  })
}

function useInstagramPosts(accountId: string | null, page: number) {
  return useQuery<{
    posts: InstagramPost[]
    total: number
    page: number
    totalPages: number
  }>({
    queryKey: ["instagram", "posts", accountId, page],
    queryFn: async () => {
      const res = await fetch(`/api/instagram?action=posts&accountId=${accountId}&page=${page}`)
      if (!res.ok) throw new Error("Failed to fetch posts")
      return res.json()
    },
    enabled: !!accountId,
  })
}

function useInstagramOrders(accountId: string | null, page: number, status?: string) {
  return useQuery<{
    orders: InstagramOrder[]
    total: number
    page: number
    totalPages: number
  }>({
    queryKey: ["instagram", "orders", accountId, page, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        action: "orders",
        accountId: accountId || "",
        page: String(page),
        ...(status && { status }),
      })
      const res = await fetch(`/api/instagram?${params}`)
      if (!res.ok) throw new Error("Failed to fetch orders")
      return res.json()
    },
    enabled: !!accountId,
  })
}

function useInstagramAnalytics(accountId: string | null) {
  return useQuery<Analytics>({
    queryKey: ["instagram", "analytics", accountId],
    queryFn: async () => {
      const res = await fetch(`/api/instagram?action=analytics&accountId=${accountId}`)
      if (!res.ok) throw new Error("Failed to fetch analytics")
      return res.json()
    },
    enabled: !!accountId,
  })
}

function useShopProducts() {
  return useQuery<{ products: ShopProduct[] }>({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const res = await fetch("/api/products?isActive=true&limit=100")
      if (!res.ok) throw new Error("Failed to fetch products")
      return res.json()
    },
  })
}

export function InstagramShopPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState("overview")
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [productsPage, setProductsPage] = useState(1)
  const [postsPage, setPostsPage] = useState(1)
  const [ordersPage, setOrdersPage] = useState(1)
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("")

  // Dialogs
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  // Queries
  const { data: accountsData, isLoading: loadingAccounts } = useInstagramAccounts()
  const { data: productsData, isLoading: loadingProducts } = useInstagramProducts(selectedAccount, productsPage)
  const { data: postsData, isLoading: loadingPosts } = useInstagramPosts(selectedAccount, postsPage)
  const { data: ordersData, isLoading: loadingOrders } = useInstagramOrders(selectedAccount, ordersPage, orderStatusFilter)
  const { data: analyticsData, isLoading: loadingAnalytics } = useInstagramAnalytics(selectedAccount)
  const { data: shopProductsData } = useShopProducts()

  const accounts = accountsData?.accounts || []
  const selectedAccountData = accounts.find(a => a.id === selectedAccount)

  // Mutations
  const syncProductsMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const res = await fetch("/api/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_products",
          accountId: selectedAccount,
          productIds,
        }),
      })
      if (!res.ok) throw new Error("Failed to sync products")
      return res.json()
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: data.message })
      queryClient.invalidateQueries({ queryKey: ["instagram", "products"] })
      setSyncDialogOpen(false)
      setSelectedProducts([])
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to sync products", variant: "destructive" })
    },
  })

  const updateAccountMutation = useMutation({
    mutationFn: async (data: { autoSync?: boolean; status?: string }) => {
      const res = await fetch("/api/instagram", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_account",
          accountId: selectedAccount,
          ...data,
        }),
      })
      if (!res.ok) throw new Error("Failed to update account")
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Account settings updated" })
      queryClient.invalidateQueries({ queryKey: ["instagram", "accounts"] })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update account", variant: "destructive" })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/instagram?action=disconnect_account&id=${selectedAccount}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to disconnect")
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Disconnected", description: "Instagram account has been disconnected" })
      queryClient.invalidateQueries({ queryKey: ["instagram"] })
      setSelectedAccount(null)
      setDisconnectDialogOpen(false)
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to disconnect account", variant: "destructive" })
    },
  })

  const convertOrderMutation = useMutation({
    mutationFn: async (instagramOrderId: string) => {
      const res = await fetch("/api/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert_order",
          instagramOrderId,
        }),
      })
      if (!res.ok) throw new Error("Failed to convert order")
      return res.json()
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: `Order created: ${data.order.orderNumber}` })
      queryClient.invalidateQueries({ queryKey: ["instagram", "orders"] })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to convert order", variant: "destructive" })
    },
  })

  // Auto-select first account if available
  if (accounts.length > 0 && !selectedAccount) {
    setSelectedAccount(accounts[0].id)
  }

  // Loading state
  if (loadingAccounts) {
    return (
      <AdminLoading
        title="Instagram Shop"
        subtitle="Connect and manage your Instagram Shopping integration"
        rows={4}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Instagram Shop"
        subtitle="Connect and manage your Instagram Shopping integration"
      >
        {accounts.length > 0 && (
          <Select value={selectedAccount || ""} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  @{account.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button onClick={() => setConnectDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Connect Account
        </Button>
      </AdminPageHeader>

      {/* No accounts state */}
      {accounts.length === 0 && (
        <AdminDataCard>
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
              <Instagram className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Your Instagram Business Account</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Link your Instagram Business account to sync products, tag items in posts,
              and import orders from Instagram Shopping.
            </p>
            <Button onClick={() => setConnectDialogOpen(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Connect Instagram
            </Button>
          </div>
        </AdminDataCard>
      )}

      {/* Main content */}
      {selectedAccount && (
        <>
          {/* Account summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {selectedAccountData?.profilePicture ? (
                    <img
                      src={selectedAccountData.profilePicture}
                      alt={selectedAccountData.username}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Instagram className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">@{selectedAccountData?.username}</p>
                    <AdminBadge variant={statusVariants[selectedAccountData?.status || "ACTIVE"]}>
                      {selectedAccountData?.status}
                    </AdminBadge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Followers</p>
                    <p className="text-2xl font-semibold">
                      {selectedAccountData?.followersCount.toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Products Synced</p>
                    <p className="text-2xl font-semibold">{selectedAccountData?.productCount}</p>
                  </div>
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Orders Imported</p>
                    <p className="text-2xl font-semibold">{selectedAccountData?.orderCount}</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {loadingAnalytics ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="h-4 w-24 mb-2 bg-muted animate-pulse rounded" />
                        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : analyticsData ? (
                <>
                  {/* Performance metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Eye className="h-4 w-4" />
                          Total Reach
                        </div>
                        <p className="text-2xl font-semibold">
                          {analyticsData.summary.totalReach.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Heart className="h-4 w-4" />
                          Engagement
                        </div>
                        <p className="text-2xl font-semibold">
                          {analyticsData.summary.totalEngagement.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <MousePointer className="h-4 w-4" />
                          Product Clicks
                        </div>
                        <p className="text-2xl font-semibold">
                          {analyticsData.summary.totalProductClicks.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <DollarSign className="h-4 w-4" />
                          Revenue
                        </div>
                        <p className="text-2xl font-semibold">
                          ${analyticsData.summary.orderRevenue.toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Top posts and products */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Posts */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Top Performing Posts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analyticsData.topPosts.length === 0 ? (
                            <AdminEmptyState message="No posts with product tags yet" />
                          ) : (
                            analyticsData.topPosts.map((post) => (
                              <div key={post.id} className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
                                  {post.thumbnailUrl ? (
                                    <img
                                      src={post.thumbnailUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Image className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {post.productClicks} clicks
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {post.conversions} conversions · ${post.revenue.toFixed(2)}
                                  </p>
                                </div>
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Products */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Top Products on Instagram</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analyticsData.topProducts.length === 0 ? (
                            <AdminEmptyState message="No products synced yet" />
                          ) : (
                            analyticsData.topProducts.map((product) => (
                              <div key={product.id} className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {product.clicks} clicks · {product.saves} saves
                                  </p>
                                </div>
                                <p className="text-sm font-medium">${product.price.toFixed(2)}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : null}
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {productsData?.total || 0} products synced to Instagram
                </p>
                <Button onClick={() => setSyncDialogOpen(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Products
                </Button>
              </div>

              <AdminDataCard>
                {loadingProducts ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : productsData?.products.length === 0 ? (
                  <AdminEmptyState message="No products synced yet. Click 'Sync Products' to get started." />
                ) : (
                  <AdminTable>
                    <AdminTableHeader>
                      <AdminTableHeadRow>
                        <AdminTableHead>Product</AdminTableHead>
                        <AdminTableHead>SKU</AdminTableHead>
                        <AdminTableHead>Status</AdminTableHead>
                        <AdminTableHead className="text-right">Impressions</AdminTableHead>
                        <AdminTableHead className="text-right">Clicks</AdminTableHead>
                        <AdminTableHead className="text-right">Saves</AdminTableHead>
                      </AdminTableHeadRow>
                    </AdminTableHeader>
                    <AdminTableBody>
                      {productsData?.products.map((item) => (
                        <AdminTableRow key={item.id}>
                          <AdminTableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                                {item.product.imageUrl ? (
                                  <img
                                    src={item.product.imageUrl}
                                    alt={item.product.nameEn}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{item.product.nameEn}</p>
                                <p className="text-sm text-muted-foreground">
                                  ${Number(item.product.priceUsd).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </AdminTableCell>
                          <AdminTableCell className="font-mono text-sm">{item.product.sku}</AdminTableCell>
                          <AdminTableCell>
                            <AdminBadge variant={statusVariants[item.syncStatus]}>
                              {item.syncStatus}
                            </AdminBadge>
                          </AdminTableCell>
                          <AdminTableCell className="text-right">{item.impressions.toLocaleString()}</AdminTableCell>
                          <AdminTableCell className="text-right">{item.clicks.toLocaleString()}</AdminTableCell>
                          <AdminTableCell className="text-right">{item.saves.toLocaleString()}</AdminTableCell>
                        </AdminTableRow>
                      ))}
                    </AdminTableBody>
                  </AdminTable>
                )}
              </AdminDataCard>

              {/* Pagination */}
              {productsData && productsData.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProductsPage(p => Math.max(1, p - 1))}
                    disabled={productsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {productsPage} of {productsData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProductsPage(p => Math.min(productsData.totalPages, p + 1))}
                    disabled={productsPage === productsData.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Posts Tab */}
            <TabsContent value="posts" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {postsData?.total || 0} posts with product tags
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {loadingPosts ? (
                  [...Array(8)].map((_, i) => (
                    <Card key={i}>
                      <div className="aspect-square bg-muted animate-pulse" />
                      <CardContent className="p-3">
                        <div className="h-4 w-full mb-2 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                      </CardContent>
                    </Card>
                  ))
                ) : postsData?.posts.length === 0 ? (
                  <div className="col-span-full">
                    <AdminEmptyState message="No posts with product tags yet" />
                  </div>
                ) : (
                  postsData?.posts.map((post) => (
                    <Card key={post.id} className="overflow-hidden">
                      <div className="aspect-square bg-muted relative">
                        {post.thumbnailUrl || post.mediaUrl ? (
                          <img
                            src={post.thumbnailUrl || post.mediaUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {post.taggedProducts.length > 0 && (
                          <AdminBadge variant="secondary">
                            <Tag className="h-3 w-3 mr-1" />
                            {post.taggedProducts.length}
                          </AdminBadge>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {post.likeCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" /> {post.commentCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointer className="h-3 w-3" /> {post.productClicks}
                          </span>
                        </div>
                        {post.conversions > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            {post.conversions} sales · ${post.revenue.toFixed(2)}
                          </p>
                        )}
                        <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                          <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                            View on Instagram
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {postsData && postsData.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPostsPage(p => Math.max(1, p - 1))}
                    disabled={postsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {postsPage} of {postsData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPostsPage(p => Math.min(postsData.totalPages, p + 1))}
                    disabled={postsPage === postsData.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {ordersData?.total || 0} orders from Instagram
                </p>
                <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IMPORTED">Imported</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="SKIPPED">Skipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <AdminDataCard>
                {loadingOrders ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : ordersData?.orders.length === 0 ? (
                  <AdminEmptyState message="No orders from Instagram yet" />
                ) : (
                  <AdminTable>
                    <AdminTableHeader>
                      <AdminTableHeadRow>
                        <AdminTableHead>Order ID</AdminTableHead>
                        <AdminTableHead>Customer</AdminTableHead>
                        <AdminTableHead>Items</AdminTableHead>
                        <AdminTableHead>Total</AdminTableHead>
                        <AdminTableHead>Status</AdminTableHead>
                        <AdminTableHead>Date</AdminTableHead>
                        <AdminTableHead></AdminTableHead>
                      </AdminTableHeadRow>
                    </AdminTableHeader>
                    <AdminTableBody>
                      {ordersData?.orders.map((order) => (
                        <AdminTableRow key={order.id}>
                          <AdminTableCell className="font-mono text-sm">
                            {order.instagramOrderId.slice(0, 12)}...
                          </AdminTableCell>
                          <AdminTableCell>
                            <div>
                              <p className="font-medium">{order.buyerName}</p>
                              {order.buyerEmail && (
                                <p className="text-xs text-muted-foreground">{order.buyerEmail}</p>
                              )}
                            </div>
                          </AdminTableCell>
                          <AdminTableCell>{order.items.length} items</AdminTableCell>
                          <AdminTableCell>${order.totalUsd.toFixed(2)}</AdminTableCell>
                          <AdminTableCell>
                            <AdminBadge variant={statusVariants[order.importStatus]}>
                              {order.importStatus}
                            </AdminBadge>
                          </AdminTableCell>
                          <AdminTableCell className="text-sm">
                            {new Date(order.orderedAt).toLocaleDateString()}
                          </AdminTableCell>
                          <AdminTableCell>
                            {order.importStatus === "PENDING" ? (
                              <Button
                                size="sm"
                                onClick={() => convertOrderMutation.mutate(order.instagramOrderId)}
                                disabled={convertOrderMutation.isPending}
                              >
                                Import
                              </Button>
                            ) : order.linkedOrder ? (
                              <Button variant="ghost" size="sm">
                                {order.linkedOrder.orderNumber}
                              </Button>
                            ) : null}
                          </AdminTableCell>
                        </AdminTableRow>
                      ))}
                    </AdminTableBody>
                  </AdminTable>
                )}
              </AdminDataCard>

              {/* Pagination */}
              {ordersData && ordersData.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                    disabled={ordersPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {ordersPage} of {ordersData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOrdersPage(p => Math.min(ordersData.totalPages, p + 1))}
                    disabled={ordersPage === ordersData.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your Instagram integration settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Sync Products</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync new products to Instagram catalog
                      </p>
                    </div>
                    <Switch
                      checked={selectedAccountData?.autoSync || false}
                      onCheckedChange={(checked) => updateAccountMutation.mutate({ autoSync: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Account Status</Label>
                      <p className="text-sm text-muted-foreground">
                        Pause syncing without disconnecting
                      </p>
                    </div>
                    <Select
                      value={selectedAccountData?.status || "ACTIVE"}
                      onValueChange={(value) => updateAccountMutation.mutate({ status: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="PAUSED">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-red-600">Disconnect Account</Label>
                        <p className="text-sm text-muted-foreground">
                          Remove Instagram integration. Products and orders will be preserved.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => setDisconnectDialogOpen(true)}
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Last sync info */}
              {selectedAccountData?.lastSyncAt && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Last synced: {new Date(selectedAccountData.lastSyncAt).toLocaleString()}
                    </div>
                    {selectedAccountData.syncError && (
                      <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                        <AlertCircle className="h-4 w-4" />
                        {selectedAccountData.syncError}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Connect Account Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Instagram Business Account</DialogTitle>
            <DialogDescription>
              Connect your Instagram Business account to enable product tagging and shopping features.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Requirements:</h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Instagram Business or Creator account
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Connected to a Facebook Page
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Facebook Commerce Manager setup
                </li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              You&apos;ll be redirected to Instagram to authorize the connection.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
              <Instagram className="h-4 w-4 mr-2" />
              Connect with Instagram
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Products Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sync Products to Instagram</DialogTitle>
            <DialogDescription>
              Select products to sync to your Instagram product catalog
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {shopProductsData?.products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-muted"
              >
                <Checkbox
                  checked={selectedProducts.includes(product.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedProducts([...selectedProducts, product.id])
                    } else {
                      setSelectedProducts(selectedProducts.filter(id => id !== product.id))
                    }
                  }}
                />
                <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.nameEn}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{product.nameEn}</p>
                  <p className="text-sm text-muted-foreground">
                    {product.sku} · ${Number(product.priceUsd).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <div className="flex items-center gap-2 mr-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProducts(shopProductsData?.products.map(p => p.id) || [])}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProducts([])}
              >
                Clear
              </Button>
            </div>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => syncProductsMutation.mutate(selectedProducts)}
              disabled={selectedProducts.length === 0 || syncProductsMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncProductsMutation.isPending ? 'animate-spin' : ''}`} />
              Sync {selectedProducts.length} Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Instagram Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your Instagram account. Your synced products and imported orders will be preserved, but you won&apos;t be able to sync new products or import new orders until you reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
