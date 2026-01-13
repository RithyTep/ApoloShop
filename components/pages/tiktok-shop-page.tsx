"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Link2,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Eye,
  MousePointer,
  Heart,
  MessageCircle,
  ExternalLink,
  Plus,
  Check,
  X,
  AlertCircle,
  Clock,
  Package,
  Users,
  DollarSign,
  Tag,
  Settings,
  Unlink,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Video,
  Play,
  Radio,
  Share2,
  ShoppingCart,
  Gift,
  Calendar,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

// TikTok icon component
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  )
}

// Types
interface TikTokAccount {
  id: string
  tiktokId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  followersCount: number
  likesCount: number
  videoCount: number
  shopId: string | null
  shopName: string | null
  shopStatus: string | null
  status: "ACTIVE" | "PAUSED" | "ERROR" | "DISCONNECTED"
  lastSyncAt: string | null
  syncError: string | null
  autoSync: boolean
  liveEnabled: boolean
  connectedAt: string
  productCount: number
  videoCountDb: number
  orderCount: number
  liveStreamCount: number
}

interface TikTokProduct {
  id: string
  productId: string
  tiktokProductId: string | null
  syncStatus: "PENDING" | "SYNCED" | "ERROR" | "REMOVED"
  lastSyncAt: string | null
  syncError: string | null
  impressions: number
  clicks: number
  addToCart: number
  purchases: number
  revenue: number
  videosTagged: number
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
  title: string | null
  description: string | null
  coverUrl: string | null
  shareUrl: string
  duration: number
  likeCount: number
  commentCount: number
  shareCount: number
  viewCount: number
  playCount: number
  productClicks: number
  conversions: number
  revenue: number
  isLive: boolean
  liveStream: { id: string; title: string; status: string } | null
  postedAt: string
  taggedProducts: Array<{
    productId: string
    name: string
    imageUrl: string | null
    clicks: number
    timestamp: number | null
  }>
}

interface TikTokOrder {
  id: string
  tiktokOrderId: string
  buyerName: string
  buyerEmail: string | null
  items: Array<{ productId: string; quantity: number; name?: string }>
  totalUsd: number
  totalKhr: number
  tiktokStatus: string
  importStatus: "PENDING" | "IMPORTED" | "FAILED" | "SKIPPED"
  importError: string | null
  sourceVideoId: string | null
  sourceLiveId: string | null
  orderedAt: string
  importedAt: string | null
  linkedOrder: { id: string; orderNumber: string; status: string } | null
}

interface TikTokLiveStream {
  id: string
  streamId: string
  title: string | null
  coverUrl: string | null
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED"
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  duration: number
  peakViewers: number
  totalViewers: number
  likeCount: number
  commentCount: number
  shareCount: number
  giftCount: number
  productClicks: number
  addToCart: number
  conversions: number
  revenue: number
  featuredProducts: string[] | null
}

interface Analytics {
  account: {
    username: string
    displayName: string | null
    followersCount: number
    likesCount: number
    videoCount: number
    shopName: string | null
    shopStatus: string | null
    lastSyncAt: string | null
    liveEnabled: boolean
  }
  summary: {
    totalVideos: number
    totalViews: number
    totalPlays: number
    totalEngagement: number
    avgViews: number
    avgLikes: number
    totalProductClicks: number
    totalConversions: number
    totalRevenue: number
    ordersImported: number
    orderRevenue: number
  }
  liveStats: {
    totalStreams: number
    totalViewers: number
    avgPeakViewers: number
    avgDuration: number
    liveConversions: number
    liveRevenue: number
  }
  topVideos: Array<{
    id: string
    videoId: string
    title: string | null
    coverUrl: string | null
    shareUrl: string
    viewCount: number
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
    addToCart: number
    purchases: number
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

function useTikTokOrders(accountId: string | null, page: number, status?: string) {
  return useQuery<{
    orders: TikTokOrder[]
    total: number
    page: number
    totalPages: number
  }>({
    queryKey: ["tiktok", "orders", accountId, page, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        action: "orders",
        accountId: accountId || "",
        page: String(page),
        ...(status && { status }),
      })
      const res = await fetch(`/api/tiktok?${params}`)
      if (!res.ok) throw new Error("Failed to fetch orders")
      return res.json()
    },
    enabled: !!accountId,
  })
}

function useTikTokLiveStreams(accountId: string | null, page: number, status?: string) {
  return useQuery<{
    liveStreams: TikTokLiveStream[]
    total: number
    page: number
    totalPages: number
  }>({
    queryKey: ["tiktok", "live-streams", accountId, page, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        action: "live-streams",
        accountId: accountId || "",
        page: String(page),
        ...(status && { liveStatus: status }),
      })
      const res = await fetch(`/api/tiktok?${params}`)
      if (!res.ok) throw new Error("Failed to fetch live streams")
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

// Status badge styles
const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  PAUSED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  ERROR: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  DISCONNECTED: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  PENDING: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  SYNCED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  IMPORTED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  SKIPPED: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  REMOVED: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  LIVE: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  ENDED: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  CANCELLED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
}

// Format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// Format number with K/M suffix
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toString()
}

export function TikTokShopPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState("overview")
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [productsPage, setProductsPage] = useState(1)
  const [videosPage, setVideosPage] = useState(1)
  const [ordersPage, setOrdersPage] = useState(1)
  const [liveStreamsPage, setLiveStreamsPage] = useState(1)
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("")
  const [liveStatusFilter, setLiveStatusFilter] = useState<string>("")

  // Dialogs
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [scheduleLiveDialogOpen, setScheduleLiveDialogOpen] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [liveTitle, setLiveTitle] = useState("")
  const [liveScheduledAt, setLiveScheduledAt] = useState("")

  // Queries
  const { data: accountsData, isLoading: loadingAccounts } = useTikTokAccounts()
  const { data: productsData, isLoading: loadingProducts } = useTikTokProducts(selectedAccount, productsPage)
  const { data: videosData, isLoading: loadingVideos } = useTikTokVideos(selectedAccount, videosPage)
  const { data: ordersData, isLoading: loadingOrders } = useTikTokOrders(selectedAccount, ordersPage, orderStatusFilter)
  const { data: liveStreamsData, isLoading: loadingLiveStreams } = useTikTokLiveStreams(selectedAccount, liveStreamsPage, liveStatusFilter)
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

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { autoSync?: boolean; syncProducts?: boolean; syncOrders?: boolean; liveEnabled?: boolean }) => {
      const res = await fetch("/api/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          accountId: selectedAccount,
          ...data,
        }),
      })
      if (!res.ok) throw new Error("Failed to update settings")
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Settings updated" })
      queryClient.invalidateQueries({ queryKey: ["tiktok", "accounts"] })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          accountId: selectedAccount,
        }),
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

  const scheduleLiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule_live",
          accountId: selectedAccount,
          title: liveTitle,
          scheduledAt: liveScheduledAt || undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to schedule live stream")
      return res.json()
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: data.message })
      queryClient.invalidateQueries({ queryKey: ["tiktok", "live-streams"] })
      setScheduleLiveDialogOpen(false)
      setLiveTitle("")
      setLiveScheduledAt("")
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to schedule live stream", variant: "destructive" })
    },
  })

  // Auto-select first account if available
  if (accounts.length > 0 && !selectedAccount) {
    setSelectedAccount(accounts[0].id)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <TikTokIcon className="h-6 w-6" />
            TikTok Shop
          </h1>
          <p className="text-muted-foreground">
            Connect and manage your TikTok Shop integration with live shopping support
          </p>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* No accounts state */}
      {!loadingAccounts && accounts.length === 0 && (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4">
            <TikTokIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Connect Your TikTok Business Account</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Link your TikTok Business account to sync products, showcase items in videos,
            and sell through TikTok Live shopping.
          </p>
          <Button onClick={() => setConnectDialogOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" />
            Connect TikTok
          </Button>
        </Card>
      )}

      {/* Main content */}
      {selectedAccount && (
        <>
          {/* Account summary */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {selectedAccountData?.avatarUrl ? (
                    <img
                      src={selectedAccountData.avatarUrl}
                      alt={selectedAccountData.username}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                      <TikTokIcon className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">@{selectedAccountData?.username}</p>
                    <div className="flex gap-1">
                      <Badge className={statusColors[selectedAccountData?.status || "ACTIVE"]}>
                        {selectedAccountData?.status}
                      </Badge>
                      {selectedAccountData?.liveEnabled && (
                        <Badge variant="outline" className="text-xs">
                          <Radio className="h-3 w-3 mr-1" />
                          Live
                        </Badge>
                      )}
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
                      {formatNumber(selectedAccountData?.followersCount || 0)}
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
                    <p className="text-sm text-muted-foreground">Total Likes</p>
                    <p className="text-2xl font-semibold">
                      {formatNumber(selectedAccountData?.likesCount || 0)}
                    </p>
                  </div>
                  <Heart className="h-8 w-8 text-muted-foreground" />
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
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="live">Live Shopping</TabsTrigger>
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
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-8 w-16" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : analyticsData ? (
                <>
                  {/* Video Performance metrics */}
                  <div>
                    <h3 className="font-medium mb-3">Video Performance</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Play className="h-4 w-4" />
                            Total Views
                          </div>
                          <p className="text-2xl font-semibold">
                            {formatNumber(analyticsData.summary.totalViews)}
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
                            {formatNumber(analyticsData.summary.totalEngagement)}
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
                            {formatNumber(analyticsData.summary.totalProductClicks)}
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
                            ${analyticsData.summary.totalRevenue.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Live Shopping stats */}
                  {analyticsData.account.liveEnabled && (
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Radio className="h-4 w-4 text-red-500" />
                        Live Shopping Performance
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <Video className="h-4 w-4" />
                              Total Streams
                            </div>
                            <p className="text-2xl font-semibold">{analyticsData.liveStats.totalStreams}</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <Users className="h-4 w-4" />
                              Total Viewers
                            </div>
                            <p className="text-2xl font-semibold">
                              {formatNumber(analyticsData.liveStats.totalViewers)}
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <ShoppingCart className="h-4 w-4" />
                              Live Conversions
                            </div>
                            <p className="text-2xl font-semibold">{analyticsData.liveStats.liveConversions}</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <DollarSign className="h-4 w-4" />
                              Live Revenue
                            </div>
                            <p className="text-2xl font-semibold">
                              ${analyticsData.liveStats.liveRevenue.toLocaleString()}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* Top Videos */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Top Performing Videos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analyticsData.topVideos.map((video) => (
                            <div key={video.id} className="flex items-center gap-3">
                              <div className="w-16 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                                {video.coverUrl ? (
                                  <img
                                    src={video.coverUrl}
                                    alt={video.title || "Video"}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Video className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{video.title || "Untitled"}</p>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {formatNumber(video.viewCount)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MousePointer className="h-3 w-3" />
                                    {video.productClicks}
                                  </span>
                                </div>
                                <p className="text-sm text-green-600">${video.revenue.toLocaleString()}</p>
                              </div>
                              <Button variant="ghost" size="icon" asChild>
                                <a href={video.shareUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          ))}
                          {analyticsData.topVideos.length === 0 && (
                            <p className="text-muted-foreground text-center py-4">No videos yet</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Products */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Top Products</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analyticsData.topProducts.map((product) => (
                            <div key={product.id} className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
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
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{product.name}</p>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span>{product.purchases} sales</span>
                                  <span>${product.price.toFixed(2)}</span>
                                </div>
                              </div>
                              <p className="text-sm font-medium text-green-600">
                                ${product.revenue.toLocaleString()}
                              </p>
                            </div>
                          ))}
                          {analyticsData.topProducts.length === 0 && (
                            <p className="text-muted-foreground text-center py-4">No products synced</p>
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

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Impressions</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">Add to Cart</TableHead>
                      <TableHead className="text-right">Purchases</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Videos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingProducts ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        </TableRow>
                      ))
                    ) : productsData?.products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No products synced yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      productsData?.products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {product.product.imageUrl ? (
                                <img
                                  src={product.product.imageUrl}
                                  alt={product.product.nameEn}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{product.product.nameEn}</p>
                                <p className="text-xs text-muted-foreground">{product.product.sku}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[product.syncStatus]}>
                              {product.syncStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(product.impressions)}</TableCell>
                          <TableCell className="text-right">{formatNumber(product.clicks)}</TableCell>
                          <TableCell className="text-right">{product.addToCart}</TableCell>
                          <TableCell className="text-right">{product.purchases}</TableCell>
                          <TableCell className="text-right">${product.revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{product.videosTagged}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* Pagination */}
              {productsData && productsData.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProductsPage(p => Math.max(1, p - 1))}
                    disabled={productsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-3 text-sm">
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
                {videosData?.total || 0} videos with product showcase
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingVideos ? (
                  [...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <Skeleton className="h-48 w-full" />
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))
                ) : videosData?.videos.length === 0 ? (
                  <Card className="col-span-full p-8 text-center">
                    <Video className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No videos yet</p>
                  </Card>
                ) : (
                  videosData?.videos.map((video) => (
                    <Card key={video.id} className="overflow-hidden">
                      <div className="relative aspect-[9/16] bg-muted">
                        {video.coverUrl ? (
                          <img
                            src={video.coverUrl}
                            alt={video.title || "Video"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        {video.isLive && (
                          <Badge className="absolute top-2 left-2 bg-red-500">
                            <Radio className="h-3 w-3 mr-1" />
                            From Live
                          </Badge>
                        )}
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                          {formatDuration(video.duration)}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <p className="font-medium truncate mb-2">{video.title || "Untitled"}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            {formatNumber(video.viewCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {formatNumber(video.likeCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            {formatNumber(video.shareCount)}
                          </span>
                        </div>
                        {video.taggedProducts.length > 0 && (
                          <div className="flex items-center gap-1 mb-2">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {video.taggedProducts.length} products tagged
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-green-600 font-medium">${video.revenue.toLocaleString()}</span>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={video.shareUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {videosData && videosData.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVideosPage(p => Math.max(1, p - 1))}
                    disabled={videosPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-3 text-sm">
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

            {/* Live Shopping Tab */}
            <TabsContent value="live" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    {liveStreamsData?.total || 0} live streams
                  </p>
                  <Select value={liveStatusFilter} onValueChange={setLiveStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                      <SelectItem value="LIVE">Live</SelectItem>
                      <SelectItem value="ENDED">Ended</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedAccountData?.liveEnabled && (
                  <Button onClick={() => setScheduleLiveDialogOpen(true)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Live
                  </Button>
                )}
              </div>

              {!selectedAccountData?.liveEnabled && (
                <Card className="p-8 text-center">
                  <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-2">Live Shopping Not Enabled</h3>
                  <p className="text-muted-foreground mb-4">
                    Enable TikTok Live shopping in settings to start selling during live streams.
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab("settings")}>
                    Go to Settings
                  </Button>
                </Card>
              )}

              {selectedAccountData?.liveEnabled && (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stream</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                        <TableHead className="text-right">Viewers</TableHead>
                        <TableHead className="text-right">Engagement</TableHead>
                        <TableHead className="text-right">Conversions</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingLiveStreams ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          </TableRow>
                        ))
                      ) : liveStreamsData?.liveStreams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No live streams yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        liveStreamsData?.liveStreams.map((stream) => (
                          <TableRow key={stream.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {stream.coverUrl ? (
                                  <img
                                    src={stream.coverUrl}
                                    alt={stream.title || "Live"}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                    <Radio className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{stream.title || "Untitled Stream"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {stream.scheduledAt
                                      ? new Date(stream.scheduledAt).toLocaleDateString()
                                      : stream.startedAt
                                      ? new Date(stream.startedAt).toLocaleDateString()
                                      : "—"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[stream.status]}>
                                {stream.status === "LIVE" && <Radio className="h-3 w-3 mr-1 animate-pulse" />}
                                {stream.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {stream.duration > 0 ? formatDuration(stream.duration) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-right">
                                <p>{formatNumber(stream.totalViewers)}</p>
                                <p className="text-xs text-muted-foreground">Peak: {formatNumber(stream.peakViewers)}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2 text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                  <Heart className="h-3 w-3" />
                                  {formatNumber(stream.likeCount)}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Gift className="h-3 w-3" />
                                  {stream.giftCount}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{stream.conversions}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              ${stream.revenue.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              )}

              {/* Pagination */}
              {liveStreamsData && liveStreamsData.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLiveStreamsPage(p => Math.max(1, p - 1))}
                    disabled={liveStreamsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-3 text-sm">
                    Page {liveStreamsPage} of {liveStreamsData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLiveStreamsPage(p => Math.min(liveStreamsData.totalPages, p + 1))}
                    disabled={liveStreamsPage === liveStreamsData.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    {ordersData?.total || 0} orders from TikTok Shop
                  </p>
                  <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="IMPORTED">Imported</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="SKIPPED">Skipped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>TikTok Status</TableHead>
                      <TableHead>Import Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingOrders ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : ordersData?.orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No orders yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      ordersData?.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">
                            {order.tiktokOrderId.slice(0, 12)}...
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.buyerName}</p>
                              {order.buyerEmail && (
                                <p className="text-xs text-muted-foreground">{order.buyerEmail}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.sourceLiveId ? (
                              <Badge variant="outline" className="text-xs">
                                <Radio className="h-3 w-3 mr-1" />
                                Live
                              </Badge>
                            ) : order.sourceVideoId ? (
                              <Badge variant="outline" className="text-xs">
                                <Video className="h-3 w-3 mr-1" />
                                Video
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Direct</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${order.totalUsd.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.tiktokStatus}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[order.importStatus]}>
                              {order.importStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(order.orderedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {order.importStatus === "PENDING" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => convertOrderMutation.mutate(order.tiktokOrderId)}
                                disabled={convertOrderMutation.isPending}
                              >
                                Import
                              </Button>
                            ) : order.linkedOrder ? (
                              <Badge variant="secondary">
                                {order.linkedOrder.orderNumber}
                              </Badge>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* Pagination */}
              {ordersData && ordersData.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                    disabled={ordersPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-3 text-sm">
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
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Configure your TikTok Shop integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-sync Products</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync new products to TikTok Shop
                      </p>
                    </div>
                    <Switch
                      checked={selectedAccountData?.autoSync}
                      onCheckedChange={(checked) => updateSettingsMutation.mutate({ autoSync: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Import Orders</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically import orders from TikTok Shop
                      </p>
                    </div>
                    <Switch
                      checked={true}
                      onCheckedChange={(checked) => updateSettingsMutation.mutate({ syncOrders: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        Live Shopping
                        <Badge variant="outline" className="text-xs">
                          <Radio className="h-3 w-3 mr-1" />
                          TikTok Live
                        </Badge>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enable live shopping during TikTok Live streams
                      </p>
                    </div>
                    <Switch
                      checked={selectedAccountData?.liveEnabled}
                      onCheckedChange={(checked) => updateSettingsMutation.mutate({ liveEnabled: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shop Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Shop ID</Label>
                      <p className="font-mono text-sm">
                        {selectedAccountData?.shopId || "Not configured"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Shop Name</Label>
                      <p>{selectedAccountData?.shopName || "Not configured"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Shop Status</Label>
                      <p>{selectedAccountData?.shopStatus || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Synced</Label>
                      <p>
                        {selectedAccountData?.lastSyncAt
                          ? new Date(selectedAccountData.lastSyncAt).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Disconnect Account</p>
                      <p className="text-sm text-muted-foreground">
                        Remove this TikTok account from your shop
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Connect Account Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect TikTok Business Account</DialogTitle>
            <DialogDescription>
              Link your TikTok Business account to enable product syncing and live shopping.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="mx-auto w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4">
              <TikTokIcon className="h-8 w-8 text-white" />
            </div>
            <p className="text-muted-foreground mb-4">
              Click the button below to authorize access to your TikTok Business account.
              You&apos;ll be redirected to TikTok to complete the connection.
            </p>
            <Button className="w-full">
              <TikTokIcon className="h-4 w-4 mr-2" />
              Connect with TikTok
            </Button>
          </div>
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
          <div className="max-h-96 overflow-auto border rounded-lg">
            {shopProductsData?.products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
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
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.nameEn}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{product.nameEn}</p>
                  <p className="text-sm text-muted-foreground">${product.priceUsd.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => syncProductsMutation.mutate(selectedProducts)}
              disabled={selectedProducts.length === 0 || syncProductsMutation.isPending}
            >
              {syncProductsMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Sync {selectedProducts.length} Products
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Live Dialog */}
      <Dialog open={scheduleLiveDialogOpen} onOpenChange={setScheduleLiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule TikTok Live</DialogTitle>
            <DialogDescription>
              Schedule a live shopping session on TikTok
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Stream Title</Label>
              <Input
                placeholder="e.g., Flash Sale Friday!"
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Schedule Date & Time (optional)</Label>
              <Input
                type="datetime-local"
                value={liveScheduledAt}
                onChange={(e) => setLiveScheduledAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to create an unscheduled stream
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleLiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => scheduleLiveMutation.mutate()}
              disabled={!liveTitle || scheduleLiveMutation.isPending}
            >
              {scheduleLiveMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Live
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect TikTok Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your TikTok account from your shop. Products will remain
              in TikTok Shop, but you won&apos;t be able to sync new products or import orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => disconnectMutation.mutate()}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
