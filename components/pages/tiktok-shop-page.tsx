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
  Video,
  Link2,
  RefreshCw,
  ShoppingBag,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  Plus,
  Check,
  AlertCircle,
  Clock,
  Package,
  Users,
  DollarSign,
  Play,
  Unlink,
  ChevronLeft,
  ChevronRight,
  Zap,
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
interface TikTokAccount {
  id: string
  tiktokId: string
  username: string
  displayName: string | null
  profilePicture: string | null
  followersCount: number
  videoCount: number
  status: "ACTIVE" | "PAUSED" | "ERROR" | "DISCONNECTED"
  shopStatus: "PENDING" | "APPROVED" | "REJECTED"
  lastSyncAt: string | null
  syncError: string | null
  autoSync: boolean
  connectedAt: string
  productCount: number
  livestreamCount: number
  orderCount: number
}

interface TikTokProduct {
  id: string
  productId: string
  tiktokProductId: string | null
  syncStatus: "PENDING" | "SYNCED" | "ERROR" | "REMOVED"
  lastSyncAt: string | null
  syncError: string | null
  videoViews: number
  videoClicks: number
  livestreamViews: number
  livestreamClicks: number
  sales: number
  revenue: number
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

interface TikTokVideo {
  id: string
  videoId: string
  videoUrl: string
  thumbnailUrl: string | null
  title: string | null
  views: number
  likes: number
  comments: number
  shares: number
  productClicks: number
  conversions: number
  revenue: number
  postedAt: string
  taggedProducts: Array<{
    productId: string
    name: string
    imageUrl: string | null
    clicks: number
    sales: number
  }>
}

interface TikTokLivestream {
  id: string
  livestreamId: string
  title: string | null
  startedAt: string
  endedAt: string | null
  duration: number
  peakViewers: number
  totalViewers: number
  likes: number
  comments: number
  productClicks: number
  conversions: number
  revenue: number
  status: "LIVE" | "ENDED" | "SCHEDULED"
  taggedProducts: Array<{
    productId: string
    name: string
    imageUrl: string | null
    clicks: number
    sales: number
  }>
}

interface TikTokOrder {
  id: string
  tiktokOrderId: string
  buyerName: string
  buyerUsername: string | null
  items: Array<{ productId: string; quantity: number; name?: string }>
  totalUsd: number
  totalKhr: number
  tiktokStatus: string
  channel: "VIDEO" | "LIVE" | "SHOP"
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
    videoCount: number
    shopStatus: string
    lastSyncAt: string | null
  }
  summary: {
    totalVideos: number
    totalViews: number
    totalLikes: number
    totalComments: number
    totalShares: number
    totalProductClicks: number
    totalConversions: number
    totalRevenue: number
    totalLivestreams: number
    livestreamViewers: number
    livestreamRevenue: number
    ordersImported: number
    orderRevenue: number
  }
  ordersByChannel: Array<{
    channel: string
    count: number
    revenue: number
  }>
  topVideos: Array<{
    id: string
    thumbnailUrl: string | null
    videoUrl: string
    views: number
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
    videoClicks: number
    livestreamClicks: number
    sales: number
    revenue: number
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
  APPROVED: "default",
  REJECTED: "destructive",
  IMPORTED: "default",
  FAILED: "destructive",
  SKIPPED: "secondary",
  REMOVED: "secondary",
  LIVE: "destructive",
  ENDED: "secondary",
  SCHEDULED: "outline",
}

// API hooks
function useTikTokAccounts() {
  return useQuery<{ accounts: TikTokAccount[]; total: number }>({
    queryKey: ["tiktok", "accounts"],
    queryFn: async () => {
      const res = await fetch("/api/tiktok?action=accounts")
      if (!res.ok) throw new Error("Failed to fetch accounts")
      return res.json()
    },
  })
}

function useTikTokProducts(accountId: string | null, page: number) {
  return useQuery<{
    products: TikTokProduct[]
    total: number
    page: number
    totalPages: number
  }>({
    queryKey: ["tiktok", "products", accountId, page],
    queryFn: async () => {
      const res = await fetch(`/api/tiktok?action=products&accountId=${accountId}&page=${page}`)
      if (!res.ok) throw new Error("Failed to fetch products")
      return res.json()
    },
    enabled: !!accountId,
  })
}

function useTikTokVideos(accountId: string | null, page: number) {
  return useQuery<{
    videos: TikTokVideo[]
    total: number
    page: number
    totalPages: number
  }>({
    queryKey: ["tiktok", "videos", accountId, page],
    queryFn: async () => {
      const res = await fetch(`/api/tiktok?action=videos&accountId=${accountId}&page=${page}`)
      if (!res.ok) throw new Error("Failed to fetch videos")
      return res.json()
    },
    enabled: !!accountId,
  })
}

function useTikTokLivestreams(accountId: string | null, page: number) {
  return useQuery<{
    livestreams: TikTokLivestream[]
    total: number
    page: number
    totalPages: number
  }>({
    queryKey: ["tiktok", "livestreams", accountId, page],
    queryFn: async () => {
      const res = await fetch(`/api/tiktok?action=livestreams&accountId=${accountId}&page=${page}`)
      if (!res.ok) throw new Error("Failed to fetch livestreams")
      return res.json()
    },
    enabled: !!accountId,
  })
}

function useTikTokOrders(accountId: string | null, page: number, status?: string, channel?: string) {
  return useQuery<{
    orders: TikTokOrder[]
    total: number
    page: number
    totalPages: number
  }>({
    queryKey: ["tiktok", "orders", accountId, page, status, channel],
    queryFn: async () => {
      const params = new URLSearchParams({
        action: "orders",
        accountId: accountId || "",
        page: String(page),
        ...(status && { status }),
        ...(channel && { channel }),
      })
      const res = await fetch(`/api/tiktok?${params}`)
      if (!res.ok) throw new Error("Failed to fetch orders")
      return res.json()
    },
    enabled: !!accountId,
  })
}

function useTikTokAnalytics(accountId: string | null) {
  return useQuery<Analytics>({
    queryKey: ["tiktok", "analytics", accountId],
    queryFn: async () => {
      const res = await fetch(`/api/tiktok?action=analytics&accountId=${accountId}`)
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

export function TikTokShopPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState("overview")
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [productsPage, setProductsPage] = useState(1)
  const [videosPage, setVideosPage] = useState(1)
  const [livestreamsPage, setLivestreamsPage] = useState(1)
  const [ordersPage, setOrdersPage] = useState(1)
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("")
  const [orderChannelFilter, setOrderChannelFilter] = useState<string>("")

  // Dialogs
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  // Queries
  const { data: accountsData, isLoading: loadingAccounts } = useTikTokAccounts()
  const { data: productsData, isLoading: loadingProducts } = useTikTokProducts(selectedAccount, productsPage)
  const { data: videosData, isLoading: loadingVideos } = useTikTokVideos(selectedAccount, videosPage)
  const { data: livestreamsData, isLoading: loadingLivestreams } = useTikTokLivestreams(selectedAccount, livestreamsPage)
  const { data: ordersData, isLoading: loadingOrders } = useTikTokOrders(selectedAccount, ordersPage, orderStatusFilter, orderChannelFilter)
  const { data: analyticsData, isLoading: loadingAnalytics } = useTikTokAnalytics(selectedAccount)
  const { data: shopProductsData } = useShopProducts()

  const accounts = accountsData?.accounts || []
  const selectedAccountData = accounts.find(a => a.id === selectedAccount)

  // Mutations
  const syncProductsMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const res = await fetch("/api/tiktok", {
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
      queryClient.invalidateQueries({ queryKey: ["tiktok", "products"] })
      setSyncDialogOpen(false)
      setSelectedProducts([])
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to sync products", variant: "destructive" })
    },
  })

  const updateAccountMutation = useMutation({
    mutationFn: async (data: { autoSync?: boolean; status?: string }) => {
      const res = await fetch("/api/tiktok", {
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
      queryClient.invalidateQueries({ queryKey: ["tiktok", "accounts"] })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update account", variant: "destructive" })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tiktok?action=disconnect_account&id=${selectedAccount}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to disconnect")
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Disconnected", description: "TikTok account has been disconnected" })
      queryClient.invalidateQueries({ queryKey: ["tiktok"] })
      setSelectedAccount(null)
      setDisconnectDialogOpen(false)
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to disconnect account", variant: "destructive" })
    },
  })

  const convertOrderMutation = useMutation({
    mutationFn: async (tiktokOrderId: string) => {
      const res = await fetch("/api/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert_order",
          tiktokOrderId,
        }),
      })
      if (!res.ok) throw new Error("Failed to convert order")
      return res.json()
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: `Order created: ${data.order.orderNumber}` })
      queryClient.invalidateQueries({ queryKey: ["tiktok", "orders"] })
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
        title="TikTok Shop"
        subtitle="Connect and manage your TikTok Shop integration"
        rows={4}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="TikTok Shop"
        subtitle="Connect and manage your TikTok Shop integration"
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
            <div className="mx-auto w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Your TikTok Shop Account</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Link your TikTok Shop seller account to sync products, track video performance,
              manage livestream sales, and import orders.
            </p>
            <Button onClick={() => setConnectDialogOpen(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Connect TikTok Shop
            </Button>
          </div>
        </AdminDataCard>
      )}

      {/* Main content */}
      {selectedAccount && (
        <>
          {/* Account summary */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                    <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="font-medium">@{selectedAccountData?.username}</p>
                    <div className="flex gap-1">
                      <AdminBadge variant={statusVariants[selectedAccountData?.status || "ACTIVE"]}>
                        {selectedAccountData?.status}
                      </AdminBadge>
                      <AdminBadge variant={statusVariants[selectedAccountData?.shopStatus || "PENDING"]}>
                        Shop: {selectedAccountData?.shopStatus}
                      </AdminBadge>
                    </div>
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
                    <p className="text-sm text-muted-foreground">Products</p>
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
                    <p className="text-sm text-muted-foreground">Livestreams</p>
                    <p className="text-2xl font-semibold">{selectedAccountData?.livestreamCount}</p>
                  </div>
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Orders</p>
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
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="livestreams">Livestreams</TabsTrigger>
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
                          Total Views
                        </div>
                        <p className="text-2xl font-semibold">
                          {analyticsData.summary.totalViews.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Heart className="h-4 w-4" />
                          Total Likes
                        </div>
                        <p className="text-2xl font-semibold">
                          {analyticsData.summary.totalLikes.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <ShoppingBag className="h-4 w-4" />
                          Conversions
                        </div>
                        <p className="text-2xl font-semibold">
                          {analyticsData.summary.totalConversions.toLocaleString()}
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

                  {/* Orders by channel */}
                  {analyticsData.ordersByChannel.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Orders by Channel</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          {analyticsData.ordersByChannel.map((channel) => (
                            <div key={channel.channel} className="p-4 bg-muted rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                {channel.channel === "VIDEO" && <Video className="h-5 w-5" />}
                                {channel.channel === "LIVE" && <Zap className="h-5 w-5" />}
                                {channel.channel === "SHOP" && <ShoppingBag className="h-5 w-5" />}
                                <span className="font-medium capitalize">{channel.channel.toLowerCase()}</span>
                              </div>
                              <p className="text-2xl font-semibold">{channel.count}</p>
                              <p className="text-sm text-muted-foreground">${channel.revenue.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Top videos and products */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Videos */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Top Performing Videos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analyticsData.topVideos.length === 0 ? (
                            <AdminEmptyState message="No videos with product tags yet" />
                          ) : (
                            analyticsData.topVideos.map((video) => (
                              <div key={video.id} className="flex items-center gap-3">
                                <div className="w-16 h-20 rounded bg-muted overflow-hidden flex-shrink-0 relative">
                                  {video.thumbnailUrl ? (
                                    <img
                                      src={video.thumbnailUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Video className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <Play className="h-6 w-6 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {video.views.toLocaleString()} views
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {video.conversions} sales · ${video.revenue.toFixed(2)}
                                  </p>
                                </div>
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
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
                        <CardTitle className="text-base">Top Products on TikTok</CardTitle>
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
                                    {product.sales} sales · ${product.revenue.toFixed(2)}
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
                  {productsData?.total || 0} products synced to TikTok Shop
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
                        <AdminTableHead className="text-right">Video Clicks</AdminTableHead>
                        <AdminTableHead className="text-right">Live Clicks</AdminTableHead>
                        <AdminTableHead className="text-right">Sales</AdminTableHead>
                        <AdminTableHead className="text-right">Revenue</AdminTableHead>
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
                          <AdminTableCell className="text-right">{item.videoClicks.toLocaleString()}</AdminTableCell>
                          <AdminTableCell className="text-right">{item.livestreamClicks.toLocaleString()}</AdminTableCell>
                          <AdminTableCell className="text-right">{item.sales}</AdminTableCell>
                          <AdminTableCell className="text-right">${item.revenue.toFixed(2)}</AdminTableCell>
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

            {/* Videos Tab */}
            <TabsContent value="videos" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {videosData?.total || 0} videos with product tags
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {loadingVideos ? (
                  [...Array(8)].map((_, i) => (
                    <Card key={i}>
                      <div className="aspect-[9/16] bg-muted animate-pulse" />
                      <CardContent className="p-3">
                        <div className="h-4 w-full mb-2 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                      </CardContent>
                    </Card>
                  ))
                ) : videosData?.videos.length === 0 ? (
                  <div className="col-span-full">
                    <AdminEmptyState message="No videos with product tags yet" />
                  </div>
                ) : (
                  videosData?.videos.map((video) => (
                    <Card key={video.id} className="overflow-hidden">
                      <div className="aspect-[9/16] bg-muted relative">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white text-xs">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {(video.views / 1000).toFixed(1)}K
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {(video.likes / 1000).toFixed(1)}K
                          </span>
                        </div>
                        {video.taggedProducts.length > 0 && (
                          <AdminBadge variant="secondary">
                            <Package className="h-3 w-3 mr-1" />
                            {video.taggedProducts.length}
                          </AdminBadge>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" /> {video.comments}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 className="h-3 w-3" /> {video.shares}
                          </span>
                        </div>
                        {video.conversions > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            {video.conversions} sales · ${video.revenue.toFixed(2)}
                          </p>
                        )}
                        <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                          <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                            View on TikTok
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {videosData && videosData.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVideosPage(p => Math.max(1, p - 1))}
                    disabled={videosPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {videosPage} of {videosData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVideosPage(p => Math.min(videosData.totalPages, p + 1))}
                    disabled={videosPage === videosData.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Livestreams Tab */}
            <TabsContent value="livestreams" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {livestreamsData?.total || 0} livestreams with products
              </p>

              <div className="space-y-4">
                {loadingLivestreams ? (
                  [...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-32 bg-muted animate-pulse rounded" />
                          <div className="flex-1 space-y-2">
                            <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : livestreamsData?.livestreams.length === 0 ? (
                  <AdminEmptyState message="No livestreams with products yet" />
                ) : (
                  livestreamsData?.livestreams.map((stream) => (
                    <Card key={stream.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-32 bg-muted rounded relative overflow-hidden flex-shrink-0">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Zap className="h-8 w-8 text-muted-foreground" />
                            </div>
                            {stream.status === "LIVE" && (
                              <div className="absolute top-2 left-2">
                                <AdminBadge variant="destructive">
                                  LIVE
                                </AdminBadge>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">
                                {stream.title || "Livestream"}
                              </h4>
                              <AdminBadge variant={statusVariants[stream.status]}>
                                {stream.status}
                              </AdminBadge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {new Date(stream.startedAt).toLocaleString()}
                              {stream.duration > 0 && ` · ${Math.round(stream.duration / 60)} min`}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {stream.peakViewers.toLocaleString()} peak
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-4 w-4" />
                                {stream.likes.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <ShoppingBag className="h-4 w-4" />
                                {stream.conversions} sales
                              </span>
                              <span className="flex items-center gap-1 text-green-600">
                                <DollarSign className="h-4 w-4" />
                                ${stream.revenue.toFixed(2)}
                              </span>
                            </div>
                            {stream.taggedProducts.length > 0 && (
                              <div className="flex items-center gap-2 mt-3">
                                {stream.taggedProducts.slice(0, 4).map((product) => (
                                  <div key={product.productId} className="w-8 h-8 rounded bg-muted overflow-hidden">
                                    {product.imageUrl ? (
                                      <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {stream.taggedProducts.length > 4 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{stream.taggedProducts.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {livestreamsData && livestreamsData.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLivestreamsPage(p => Math.max(1, p - 1))}
                    disabled={livestreamsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {livestreamsPage} of {livestreamsData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLivestreamsPage(p => Math.min(livestreamsData.totalPages, p + 1))}
                    disabled={livestreamsPage === livestreamsData.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <div className="flex justify-between items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {ordersData?.total || 0} orders from TikTok
                </p>
                <div className="flex gap-2">
                  <Select value={orderChannelFilter} onValueChange={setOrderChannelFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All channels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All channels</SelectItem>
                      <SelectItem value="VIDEO">Video</SelectItem>
                      <SelectItem value="LIVE">Livestream</SelectItem>
                      <SelectItem value="SHOP">Shop</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                    <SelectTrigger className="w-32">
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
              </div>

              <AdminDataCard>
                {loadingOrders ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : ordersData?.orders.length === 0 ? (
                  <AdminEmptyState message="No orders from TikTok yet" />
                ) : (
                  <AdminTable>
                    <AdminTableHeader>
                      <AdminTableHeadRow>
                        <AdminTableHead>Order ID</AdminTableHead>
                        <AdminTableHead>Customer</AdminTableHead>
                        <AdminTableHead>Channel</AdminTableHead>
                        <AdminTableHead>Items</AdminTableHead>
                        <AdminTableHead className="text-right">Total</AdminTableHead>
                        <AdminTableHead>Status</AdminTableHead>
                        <AdminTableHead>Date</AdminTableHead>
                        <AdminTableHead></AdminTableHead>
                      </AdminTableHeadRow>
                    </AdminTableHeader>
                    <AdminTableBody>
                      {ordersData?.orders.map((order) => (
                        <AdminTableRow key={order.id}>
                          <AdminTableCell className="font-mono text-sm">
                            {order.tiktokOrderId.slice(0, 12)}...
                          </AdminTableCell>
                          <AdminTableCell>
                            <div>
                              <p className="font-medium">{order.buyerName}</p>
                              {order.buyerUsername && (
                                <p className="text-xs text-muted-foreground">@{order.buyerUsername}</p>
                              )}
                            </div>
                          </AdminTableCell>
                          <AdminTableCell>
                            <AdminBadge variant="outline">
                              {order.channel === "VIDEO" && <Video className="h-3 w-3 mr-1" />}
                              {order.channel === "LIVE" && <Zap className="h-3 w-3 mr-1" />}
                              {order.channel === "SHOP" && <ShoppingBag className="h-3 w-3 mr-1" />}
                              {order.channel}
                            </AdminBadge>
                          </AdminTableCell>
                          <AdminTableCell>{order.items.length} items</AdminTableCell>
                          <AdminTableCell className="text-right">${order.totalUsd.toFixed(2)}</AdminTableCell>
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
                                onClick={() => convertOrderMutation.mutate(order.tiktokOrderId)}
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
                    Manage your TikTok Shop integration settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Sync Products</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync new products to TikTok Shop
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
                          Remove TikTok integration. Products and orders will be preserved.
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
            <DialogTitle>Connect TikTok Shop Account</DialogTitle>
            <DialogDescription>
              Connect your TikTok Shop seller account to enable product syncing and order import.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Requirements:</h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  TikTok Business account
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Approved TikTok Shop seller
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Valid business registration
                </li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              You&apos;ll be redirected to TikTok to authorize the connection.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-black hover:bg-gray-900">
              <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
              Connect with TikTok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Products Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sync Products to TikTok Shop</DialogTitle>
            <DialogDescription>
              Select products to sync to your TikTok Shop catalog
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
            <AlertDialogTitle>Disconnect TikTok Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your TikTok account. Your synced products and imported orders will be preserved, but you won&apos;t be able to sync new products or import new orders until you reconnect.
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
