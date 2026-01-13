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
import { Textarea } from "@/components/ui/textarea"
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
  Facebook,
  Link2,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Eye,
  MousePointer,
  ShoppingCart,
  Plus,
  Check,
  X,
  AlertCircle,
  Package,
  Users,
  DollarSign,
  Settings,
  Unlink,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Send,
  User,
  Clock,
  Tag,
  ExternalLink,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

// Types
interface FacebookPage {
  id: string
  pageId: string
  name: string
  profilePicture: string | null
  followersCount: number
  catalogId: string | null
  status: "ACTIVE" | "PAUSED" | "ERROR" | "DISCONNECTED"
  lastSyncAt: string | null
  syncError: string | null
  autoSync: boolean
  messengerEnabled: boolean
  connectedAt: string
  productCount: number
  orderCount: number
  conversationCount: number
}

interface FacebookProduct {
  id: string
  productId: string
  catalogProductId: string | null
  syncStatus: "PENDING" | "SYNCED" | "ERROR" | "REMOVED"
  lastSyncAt: string | null
  syncError: string | null
  impressions: number
  clicks: number
  addToCart: number
  purchases: number
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

interface FacebookOrder {
  id: string
  facebookOrderId: string
  buyerName: string
  buyerEmail: string | null
  items: Array<{ productId: string; quantity: number; name?: string }>
  totalUsd: number
  totalKhr: number
  facebookStatus: string
  importStatus: "PENDING" | "IMPORTED" | "FAILED" | "SKIPPED"
  importError: string | null
  channel: string
  orderedAt: string
  importedAt: string | null
  linkedOrder: { id: string; orderNumber: string; status: string } | null
}

interface FacebookConversation {
  id: string
  threadId: string
  participantId: string
  participantName: string | null
  participantPicture: string | null
  status: "OPEN" | "CLOSED" | "PENDING" | "SPAM"
  lastMessageAt: string | null
  lastMessagePreview: string | null
  unreadCount: number
  assignedTo: string | null
  tags: string[]
  customer: { id: string; name: string; phone: string } | null
}

interface FacebookMessage {
  id: string
  messageId: string
  senderId: string
  senderName: string | null
  isFromPage: boolean
  text: string | null
  attachments: unknown
  sentAt: string
}

interface Analytics {
  page: {
    name: string
    followersCount: number
    lastSyncAt: string | null
  }
  summary: {
    totalProducts: number
    totalImpressions: number
    totalClicks: number
    totalAddToCart: number
    totalPurchases: number
    catalogRevenue: number
    ordersImported: number
    orderRevenue: number
  }
  ordersByChannel: Array<{
    channel: string
    count: number
    revenue: number
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
  conversationStats: Array<{
    status: string
    count: number
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
function useFacebookPages() {
  return useQuery<{ pages: FacebookPage[]; total: number }>({
    queryKey: ["facebook", "pages"],
    queryFn: async () => {
      const res = await fetch("/api/facebook?action=pages")
      if (!res.ok) throw new Error("Failed to fetch pages")
      return res.json()
    },
  })
}

function useFacebookProducts(pageId: string | null, page: number) {
  return useQuery<{
    products: FacebookProduct[]
    total: number
    page: number
    totalPages: number
  }>({
    queryKey: ["facebook", "products", pageId, page],
    queryFn: async () => {
      const res = await fetch(`/api/facebook?action=products&pageId=${pageId}&page=${page}`)
      if (!res.ok) throw new Error("Failed to fetch products")
      return res.json()
    },
    enabled: !!pageId,
  })
}

function useFacebookOrders(pageId: string | null, page: number, status?: string, channel?: string) {
  return useQuery<{
    orders: FacebookOrder[]
    total: number
    page: number
    totalPages: number
  }>({
    queryKey: ["facebook", "orders", pageId, page, status, channel],
    queryFn: async () => {
      const params = new URLSearchParams({
        action: "orders",
        pageId: pageId || "",
        page: String(page),
        ...(status && { status }),
        ...(channel && { channel }),
      })
      const res = await fetch(`/api/facebook?${params}`)
      if (!res.ok) throw new Error("Failed to fetch orders")
      return res.json()
    },
    enabled: !!pageId,
  })
}

function useFacebookConversations(pageId: string | null, page: number, status?: string) {
  return useQuery<{
    conversations: FacebookConversation[]
    total: number
    unreadTotal: number
    page: number
    totalPages: number
  }>({
    queryKey: ["facebook", "conversations", pageId, page, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        action: "conversations",
        pageId: pageId || "",
        page: String(page),
        ...(status && { conversationStatus: status }),
      })
      const res = await fetch(`/api/facebook?${params}`)
      if (!res.ok) throw new Error("Failed to fetch conversations")
      return res.json()
    },
    enabled: !!pageId,
  })
}

function useFacebookMessages(conversationId: string | null) {
  return useQuery<{
    messages: FacebookMessage[]
    total: number
  }>({
    queryKey: ["facebook", "messages", conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/facebook?action=messages&conversationId=${conversationId}`)
      if (!res.ok) throw new Error("Failed to fetch messages")
      return res.json()
    },
    enabled: !!conversationId,
  })
}

function useFacebookAnalytics(pageId: string | null) {
  return useQuery<Analytics>({
    queryKey: ["facebook", "analytics", pageId],
    queryFn: async () => {
      const res = await fetch(`/api/facebook?action=analytics&pageId=${pageId}`)
      if (!res.ok) throw new Error("Failed to fetch analytics")
      return res.json()
    },
    enabled: !!pageId,
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
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  CLOSED: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  SPAM: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

export function FacebookShopPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState("overview")
  const [selectedPage, setSelectedPage] = useState<string | null>(null)
  const [productsPage, setProductsPage] = useState(1)
  const [ordersPage, setOrdersPage] = useState(1)
  const [conversationsPage, setConversationsPage] = useState(1)
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("")
  const [orderChannelFilter, setOrderChannelFilter] = useState<string>("")
  const [conversationStatusFilter, setConversationStatusFilter] = useState<string>("")

  // Dialogs
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messageText, setMessageText] = useState("")

  // Queries
  const { data: pagesData, isLoading: loadingPages } = useFacebookPages()
  const { data: productsData, isLoading: loadingProducts } = useFacebookProducts(selectedPage, productsPage)
  const { data: ordersData, isLoading: loadingOrders } = useFacebookOrders(selectedPage, ordersPage, orderStatusFilter, orderChannelFilter)
  const { data: conversationsData, isLoading: loadingConversations } = useFacebookConversations(selectedPage, conversationsPage, conversationStatusFilter)
  const { data: messagesData, isLoading: loadingMessages } = useFacebookMessages(selectedConversation)
  const { data: analyticsData, isLoading: loadingAnalytics } = useFacebookAnalytics(selectedPage)
  const { data: shopProductsData } = useShopProducts()

  const pages = pagesData?.pages || []
  const selectedPageData = pages.find(p => p.id === selectedPage)

  // Mutations
  const syncProductsMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const res = await fetch("/api/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_products",
          pageId: selectedPage,
          productIds,
        }),
      })
      if (!res.ok) throw new Error("Failed to sync products")
      return res.json()
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: data.message })
      queryClient.invalidateQueries({ queryKey: ["facebook", "products"] })
      setSyncDialogOpen(false)
      setSelectedProducts([])
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to sync products", variant: "destructive" })
    },
  })

  const updatePageMutation = useMutation({
    mutationFn: async (data: { autoSync?: boolean; messengerEnabled?: boolean; status?: string }) => {
      const res = await fetch("/api/facebook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_page",
          pageId: selectedPage,
          ...data,
        }),
      })
      if (!res.ok) throw new Error("Failed to update page")
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Page settings updated" })
      queryClient.invalidateQueries({ queryKey: ["facebook", "pages"] })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update page", variant: "destructive" })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/facebook?action=disconnect_page&id=${selectedPage}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to disconnect")
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Disconnected", description: "Facebook page has been disconnected" })
      queryClient.invalidateQueries({ queryKey: ["facebook"] })
      setSelectedPage(null)
      setDisconnectDialogOpen(false)
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to disconnect page", variant: "destructive" })
    },
  })

  const convertOrderMutation = useMutation({
    mutationFn: async (facebookOrderId: string) => {
      const res = await fetch("/api/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert_order",
          facebookOrderId,
        }),
      })
      if (!res.ok) throw new Error("Failed to convert order")
      return res.json()
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: `Order created: ${data.order.orderNumber}` })
      queryClient.invalidateQueries({ queryKey: ["facebook", "orders"] })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to convert order", variant: "destructive" })
    },
  })

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_message",
          conversationId: selectedConversation,
          text: messageText,
        }),
      })
      if (!res.ok) throw new Error("Failed to send message")
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Sent", description: "Message sent successfully" })
      queryClient.invalidateQueries({ queryKey: ["facebook", "messages"] })
      queryClient.invalidateQueries({ queryKey: ["facebook", "conversations"] })
      setMessageText("")
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" })
    },
  })

  // Auto-select first page if available
  if (pages.length > 0 && !selectedPage) {
    setSelectedPage(pages[0].id)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Facebook className="h-6 w-6 text-blue-600" />
            Facebook Shop
          </h1>
          <p className="text-muted-foreground">
            Connect and manage your Facebook Shop integration
          </p>
        </div>
        <div className="flex gap-2">
          {pages.length > 0 && (
            <Select value={selectedPage || ""} onValueChange={setSelectedPage}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select page" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => setConnectDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Connect Page
          </Button>
        </div>
      </div>

      {/* No pages state */}
      {!loadingPages && pages.length === 0 && (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Facebook className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Connect Your Facebook Page</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Link your Facebook Page to sync products to Facebook Shop, import orders,
            and manage Messenger conversations for customer support.
          </p>
          <Button onClick={() => setConnectDialogOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" />
            Connect Facebook
          </Button>
        </Card>
      )}

      {/* Main content */}
      {selectedPage && (
        <>
          {/* Page summary */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {selectedPageData?.profilePicture ? (
                    <img
                      src={selectedPageData.profilePicture}
                      alt={selectedPageData.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                      <Facebook className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{selectedPageData?.name}</p>
                    <Badge className={statusColors[selectedPageData?.status || "ACTIVE"]}>
                      {selectedPageData?.status}
                    </Badge>
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
                      {selectedPageData?.followersCount.toLocaleString()}
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
                    <p className="text-2xl font-semibold">{selectedPageData?.productCount}</p>
                  </div>
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Orders</p>
                    <p className="text-2xl font-semibold">{selectedPageData?.orderCount}</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Conversations</p>
                    <p className="text-2xl font-semibold">{selectedPageData?.conversationCount}</p>
                  </div>
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="messenger">
                Messenger
                {(conversationsData?.unreadTotal || 0) > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {conversationsData?.unreadTotal}
                  </Badge>
                )}
              </TabsTrigger>
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
                  {/* Performance metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Eye className="h-4 w-4" />
                          Impressions
                        </div>
                        <p className="text-2xl font-semibold">
                          {analyticsData.summary.totalImpressions.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <MousePointer className="h-4 w-4" />
                          Clicks
                        </div>
                        <p className="text-2xl font-semibold">
                          {analyticsData.summary.totalClicks.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <ShoppingCart className="h-4 w-4" />
                          Purchases
                        </div>
                        <p className="text-2xl font-semibold">
                          {analyticsData.summary.totalPurchases.toLocaleString()}
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {analyticsData.ordersByChannel.map((channel) => (
                            <div key={channel.channel} className="p-3 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground capitalize">
                                {channel.channel.replace("_", " ")}
                              </p>
                              <p className="text-xl font-semibold">{channel.count}</p>
                              <p className="text-sm text-muted-foreground">
                                ${channel.revenue.toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Top products */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Products on Facebook</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analyticsData.topProducts.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No products synced yet
                          </p>
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
                                  {product.purchases} purchases · ${product.revenue.toFixed(2)}
                                </p>
                              </div>
                              <p className="text-sm font-medium">${product.price.toFixed(2)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {productsData?.total || 0} products synced to Facebook
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
                      <TableHead>SKU</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Impressions</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">Purchases</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingProducts ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : productsData?.products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No products synced yet. Click &quot;Sync Products&quot; to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      productsData?.products.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
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
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.product.sku}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[item.syncStatus]}>
                              {item.syncStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.impressions.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{item.clicks.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{item.purchases}</TableCell>
                          <TableCell className="text-right">${item.revenue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* Pagination */}
              {productsData && productsData.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProductsPage((p) => Math.max(1, p - 1))}
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
                    onClick={() => setProductsPage((p) => Math.min(productsData.totalPages, p + 1))}
                    disabled={productsPage === productsData.totalPages}
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
                  {ordersData?.total || 0} orders from Facebook
                </p>
                <div className="flex gap-2">
                  <Select value={orderChannelFilter} onValueChange={setOrderChannelFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All channels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All channels</SelectItem>
                      <SelectItem value="facebook_shop">Facebook Shop</SelectItem>
                      <SelectItem value="messenger">Messenger</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All status</SelectItem>
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
                      <TableHead>Channel</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
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
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : ordersData?.orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No orders from Facebook yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      ordersData?.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">
                            {order.facebookOrderId.substring(0, 10)}...
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
                            <Badge variant="outline" className="capitalize">
                              {order.channel.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.items.length}</TableCell>
                          <TableCell className="text-right">${order.totalUsd.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge className={statusColors[order.importStatus]}>
                                {order.importStatus}
                              </Badge>
                              {order.linkedOrder && (
                                <p className="text-xs text-muted-foreground">
                                  {order.linkedOrder.orderNumber}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(order.orderedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {order.importStatus === "PENDING" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => convertOrderMutation.mutate(order.facebookOrderId)}
                                disabled={convertOrderMutation.isPending}
                              >
                                Import
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* Pagination */}
              {ordersData && ordersData.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
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
                    onClick={() => setOrdersPage((p) => Math.min(ordersData.totalPages, p + 1))}
                    disabled={ordersPage === ordersData.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Messenger Tab */}
            <TabsContent value="messenger" className="space-y-4">
              <div className="flex justify-between items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {conversationsData?.total || 0} conversations
                  {conversationsData?.unreadTotal ? ` (${conversationsData.unreadTotal} unread)` : ""}
                </p>
                <Select value={conversationStatusFilter} onValueChange={setConversationStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Conversation list */}
                <Card className="lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Conversations</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      {loadingConversations ? (
                        <div className="p-4 space-y-3">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="flex-1">
                                <Skeleton className="h-4 w-24 mb-1" />
                                <Skeleton className="h-3 w-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : conversationsData?.conversations.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No conversations yet</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {conversationsData?.conversations.map((conv) => (
                            <button
                              key={conv.id}
                              onClick={() => setSelectedConversation(conv.id)}
                              className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                                selectedConversation === conv.id ? "bg-muted" : ""
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {conv.participantPicture ? (
                                  <img
                                    src={conv.participantPicture}
                                    alt={conv.participantName || "User"}
                                    className="w-10 h-10 rounded-full"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm truncate">
                                      {conv.participantName || "Unknown User"}
                                    </p>
                                    {conv.unreadCount > 0 && (
                                      <Badge variant="destructive" className="text-xs">
                                        {conv.unreadCount}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {conv.lastMessagePreview || "No messages"}
                                  </p>
                                </div>
                              </div>
                              {conv.lastMessageAt && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(conv.lastMessageAt).toLocaleString()}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Message thread */}
                <Card className="lg:col-span-2">
                  {selectedConversation ? (
                    <>
                      <CardHeader className="pb-2 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <User className="h-6 w-6 text-muted-foreground" />
                            <div>
                              <CardTitle className="text-sm">
                                {conversationsData?.conversations.find(c => c.id === selectedConversation)?.participantName || "Conversation"}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {conversationsData?.conversations.find(c => c.id === selectedConversation)?.customer?.phone || "Guest"}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className={statusColors[conversationsData?.conversations.find(c => c.id === selectedConversation)?.status || "OPEN"]}>
                            {conversationsData?.conversations.find(c => c.id === selectedConversation)?.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[350px] p-4">
                          {loadingMessages ? (
                            <div className="space-y-3">
                              {[...Array(5)].map((_, i) => (
                                <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                                  <Skeleton className="h-12 w-48 rounded-lg" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {[...(messagesData?.messages || [])].reverse().map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`flex ${msg.isFromPage ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`max-w-[70%] rounded-lg px-3 py-2 ${
                                      msg.isFromPage
                                        ? "bg-blue-600 text-white"
                                        : "bg-muted"
                                    }`}
                                  >
                                    <p className="text-sm">{msg.text}</p>
                                    <p className={`text-xs mt-1 ${msg.isFromPage ? "text-blue-100" : "text-muted-foreground"}`}>
                                      {new Date(msg.sentAt).toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                        <div className="p-4 border-t">
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="Type a message..."
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              className="resize-none"
                              rows={2}
                            />
                            <Button
                              onClick={() => sendMessageMutation.mutate()}
                              disabled={!messageText.trim() || sendMessageMutation.isPending}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Select a conversation to view messages</p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Page Settings</CardTitle>
                  <CardDescription>
                    Manage your Facebook page integration settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoSync">Auto-sync Products</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync new products to Facebook catalog
                      </p>
                    </div>
                    <Switch
                      id="autoSync"
                      checked={selectedPageData?.autoSync}
                      onCheckedChange={(checked) =>
                        updatePageMutation.mutate({ autoSync: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="messenger">Messenger Support</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable Messenger integration for customer support
                      </p>
                    </div>
                    <Switch
                      id="messenger"
                      checked={selectedPageData?.messengerEnabled}
                      onCheckedChange={(checked) =>
                        updatePageMutation.mutate({ messengerEnabled: checked })
                      }
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-destructive">Disconnect Page</p>
                        <p className="text-sm text-muted-foreground">
                          Disconnect this Facebook page from your shop
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

              <Card>
                <CardHeader>
                  <CardTitle>Connection Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Page ID</span>
                    <span className="font-mono">{selectedPageData?.pageId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Catalog ID</span>
                    <span className="font-mono">{selectedPageData?.catalogId || "Not set"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Connected</span>
                    <span>{selectedPageData?.connectedAt ? new Date(selectedPageData.connectedAt).toLocaleDateString() : "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Sync</span>
                    <span>{selectedPageData?.lastSyncAt ? new Date(selectedPageData.lastSyncAt).toLocaleString() : "Never"}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Facebook Page</DialogTitle>
            <DialogDescription>
              Connect your Facebook Page to enable Facebook Shop integration
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Facebook className="h-8 w-8 text-white" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Click the button below to connect your Facebook Page via Facebook Login.
              You&apos;ll be redirected to Facebook to authorize access.
            </p>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                // In production, this would initiate Facebook OAuth flow
                toast({
                  title: "Demo Mode",
                  description: "Facebook OAuth integration would redirect to Facebook here",
                })
              }}
            >
              <Facebook className="h-4 w-4 mr-2" />
              Continue with Facebook
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync Products Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sync Products to Facebook</DialogTitle>
            <DialogDescription>
              Select products to sync to your Facebook catalog
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {shopProductsData?.products.map((product) => {
                const isAlreadySynced = productsData?.products.some(
                  (p) => p.productId === product.id
                )
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedProducts([...selectedProducts, product.id])
                        } else {
                          setSelectedProducts(selectedProducts.filter((id) => id !== product.id))
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
                      <p className="font-medium text-sm">{product.nameEn}</p>
                      <p className="text-xs text-muted-foreground">
                        ${Number(product.priceUsd).toFixed(2)} · {product.sku}
                      </p>
                    </div>
                    {isAlreadySynced && (
                      <Badge variant="outline" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Synced
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
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
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync {selectedProducts.length} Products
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Dialog */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Facebook Page?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your Facebook page from the shop. Your synced products
              and order history will be preserved, but no new data will be synced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
