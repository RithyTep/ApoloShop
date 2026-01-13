"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Package,
  MapPin,
  Heart,
  Clock,
  Award,
  ChevronRight,
  ShoppingCart,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Star,
  Home,
  Building,
  Loader2,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { translations } from "@/lib/i18n"
import { useWishlist } from "@/lib/use-wishlist"
import { useRecentlyViewed } from "@/lib/use-recently-viewed"
import { useLoyaltyAccount, type Order, type Product, type LoyaltyTier } from "@/lib/api-hooks"
import { LoyaltyPointsCard } from "@/components/loyalty-points-card"
import { RecentlyViewed } from "@/components/recently-viewed"

// Types
interface ShippingAddress {
  id: string
  label?: string | null
  fullName: string
  phone: string
  province?: string | null
  district?: string | null
  commune?: string | null
  addressLine: string
  landmark?: string | null
  isDefault: boolean
}

interface CustomerAccountDashboardProps {
  customerId: string
  customerName?: string
  customerPhone?: string
  language?: "EN" | "KH"
  currency?: "USD" | "KHR"
}

// Tier icons
const tierIcons: Record<LoyaltyTier, string> = {
  BRONZE: "🥉",
  SILVER: "🥈",
  GOLD: "🥇",
  PLATINUM: "💎",
}

// Order status badge colors
const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-cyan-100 text-cyan-700",
  PREPARING: "bg-yellow-100 text-yellow-700",
  READY: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
}

export function CustomerAccountDashboard({
  customerId,
  customerName,
  customerPhone,
  language = "EN",
  currency = "USD",
}: CustomerAccountDashboardProps) {
  const router = useRouter()
  const t = translations[language === "EN" ? "en" : "kh"]

  // State for different sections
  const [orders, setOrders] = useState<Order[]>([])
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [addressesLoading, setAddressesLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("orders")
  const [reorderingId, setReorderingId] = useState<string | null>(null)

  // Address dialog state
  const [showAddressDialog, setShowAddressDialog] = useState(false)
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null)
  const [addressForm, setAddressForm] = useState({
    label: "",
    fullName: "",
    phone: "",
    province: "",
    district: "",
    commune: "",
    addressLine: "",
    landmark: "",
    isDefault: false,
  })
  const [addressSaving, setAddressSaving] = useState(false)

  // Wishlist hook
  const { wishlistItems, wishlistCount, isLoading: wishlistLoading, fetchWishlistItems } = useWishlist()
  const [wishlistFetched, setWishlistFetched] = useState(false)

  // Recently viewed hook
  const { viewedIds, getViewedExcluding } = useRecentlyViewed()
  const recentlyViewedCount = viewedIds.length

  // Loyalty points hook
  const { data: loyaltyData, isLoading: loyaltyLoading } = useLoyaltyAccount(customerId, {
    includeHistory: true,
  })

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const res = await fetch(`/api/orders?customerId=${customerId}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    } finally {
      setOrdersLoading(false)
    }
  }, [customerId])

  // Fetch addresses
  const fetchAddresses = useCallback(async () => {
    setAddressesLoading(true)
    try {
      const res = await fetch(`/api/shipping-addresses?customerId=${customerId}`)
      if (res.ok) {
        const data = await res.json()
        setAddresses(data.addresses || [])
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error)
    } finally {
      setAddressesLoading(false)
    }
  }, [customerId])

  // Initial data fetch
  useEffect(() => {
    fetchOrders()
    fetchAddresses()
  }, [fetchOrders, fetchAddresses])

  // Fetch wishlist items
  useEffect(() => {
    if (!wishlistFetched && activeTab === "wishlist") {
      fetchWishlistItems().then(() => setWishlistFetched(true))
    }
  }, [activeTab, wishlistFetched, fetchWishlistItems])

  // Handle reorder
  const handleReorder = async (order: Order) => {
    if (!order.items?.length) return

    setReorderingId(order.id)
    try {
      // Create a new order with the same items
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: order.customer?.name || customerName,
          customerPhone: order.customer?.phone || customerPhone,
          currency: order.currency,
          channel: "WEBSITE",
          items: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Navigate to checkout or show success
        router.push(`/shop/checkout?orderId=${data.order.id}`)
      }
    } catch (error) {
      console.error("Failed to reorder:", error)
    } finally {
      setReorderingId(null)
    }
  }

  // Address form handlers
  const openAddAddressDialog = () => {
    setEditingAddress(null)
    setAddressForm({
      label: "",
      fullName: customerName || "",
      phone: customerPhone || "",
      province: "",
      district: "",
      commune: "",
      addressLine: "",
      landmark: "",
      isDefault: addresses.length === 0,
    })
    setShowAddressDialog(true)
  }

  const openEditAddressDialog = (address: ShippingAddress) => {
    setEditingAddress(address)
    setAddressForm({
      label: address.label || "",
      fullName: address.fullName,
      phone: address.phone,
      province: address.province || "",
      district: address.district || "",
      commune: address.commune || "",
      addressLine: address.addressLine,
      landmark: address.landmark || "",
      isDefault: address.isDefault,
    })
    setShowAddressDialog(true)
  }

  const handleSaveAddress = async () => {
    setAddressSaving(true)
    try {
      const method = editingAddress ? "PUT" : "POST"
      const body = editingAddress
        ? { id: editingAddress.id, ...addressForm }
        : { customerId, ...addressForm }

      const res = await fetch("/api/shipping-addresses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await fetchAddresses()
        setShowAddressDialog(false)
      }
    } catch (error) {
      console.error("Failed to save address:", error)
    } finally {
      setAddressSaving(false)
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm(language === "EN" ? "Delete this address?" : "លុបអាសយដ្ឋាននេះ?")) return

    try {
      const res = await fetch(`/api/shipping-addresses?id=${addressId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await fetchAddresses()
      }
    } catch (error) {
      console.error("Failed to delete address:", error)
    }
  }

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const res = await fetch("/api/shipping-addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: addressId, isDefault: true }),
      })

      if (res.ok) {
        await fetchAddresses()
      }
    } catch (error) {
      console.error("Failed to set default address:", error)
    }
  }

  // Format price
  const formatPrice = (usd: number, khr: number) => {
    if (currency === "USD") {
      return `$${Number(usd).toFixed(2)}`
    }
    return `${Number(khr).toLocaleString()}៛`
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === "EN" ? "en-US" : "km-KH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Translate status
  const getStatusText = (status: string) => {
    const statusMap: Record<string, { en: string; kh: string }> = {
      NEW: { en: "New", kh: "ថ្មី" },
      CONFIRMED: { en: "Confirmed", kh: "បានបញ្ជាក់" },
      PREPARING: { en: "Preparing", kh: "កំពុងរៀបចំ" },
      READY: { en: "Ready", kh: "រួចរាល់" },
      COMPLETED: { en: "Completed", kh: "បានបញ្ចប់" },
      CANCELLED: { en: "Cancelled", kh: "បានបោះបង់" },
    }
    return statusMap[status]?.[language === "EN" ? "en" : "kh"] || status
  }

  // Account translations
  const accountT = {
    title: language === "EN" ? "My Account" : "គណនីរបស់ខ្ញុំ",
    welcome: language === "EN" ? "Welcome back" : "សូមស្វាគមន៍មកវិញ",
    tabs: {
      orders: language === "EN" ? "Order History" : "ប្រវត្តិបញ្ជាទិញ",
      addresses: language === "EN" ? "Saved Addresses" : "អាសយដ្ឋានដែលបានរក្សាទុក",
      wishlist: language === "EN" ? "Wishlist" : "បញ្ជីប្រាថ្នា",
      recentlyViewed: language === "EN" ? "Recently Viewed" : "បានមើលថ្មីៗ",
      loyalty: language === "EN" ? "Loyalty Points" : "ពិន្ទុភក្ដីភាព",
    },
    orders: {
      empty: language === "EN" ? "No orders yet" : "មិនទាន់មានការបញ្ជាទិញទេ",
      emptyDesc: language === "EN" ? "Start shopping to see your orders here" : "ចាប់ផ្តើមទិញទំនិញដើម្បីមើលការបញ្ជាទិញរបស់អ្នកនៅទីនេះ",
      reorder: language === "EN" ? "Reorder" : "បញ្ជាទិញម្ដងទៀត",
      items: language === "EN" ? "items" : "មុខទំនិញ",
      viewDetails: language === "EN" ? "View Details" : "មើលព័ត៌មានលម្អិត",
      total: language === "EN" ? "Total" : "សរុប",
    },
    addresses: {
      empty: language === "EN" ? "No saved addresses" : "មិនមានអាសយដ្ឋានដែលបានរក្សាទុកទេ",
      emptyDesc: language === "EN" ? "Add an address for faster checkout" : "បន្ថែមអាសយដ្ឋានសម្រាប់ការទូទាត់រហ័សជាង",
      addNew: language === "EN" ? "Add Address" : "បន្ថែមអាសយដ្ឋាន",
      edit: language === "EN" ? "Edit" : "កែសម្រួល",
      delete: language === "EN" ? "Delete" : "លុប",
      default: language === "EN" ? "Default" : "លំនាំដើម",
      setDefault: language === "EN" ? "Set as default" : "កំណត់ជាលំនាំដើម",
      labels: {
        home: language === "EN" ? "Home" : "ផ្ទះ",
        work: language === "EN" ? "Work" : "ការិយាល័យ",
        other: language === "EN" ? "Other" : "ផ្សេងទៀត",
      },
    },
    addressForm: {
      title: language === "EN" ? "Shipping Address" : "អាសយដ្ឋានដឹកជញ្ជូន",
      label: language === "EN" ? "Label (optional)" : "ស្លាក (ជម្រើស)",
      fullName: language === "EN" ? "Full Name" : "ឈ្មោះពេញ",
      phone: language === "EN" ? "Phone" : "ទូរស័ព្ទ",
      province: language === "EN" ? "Province" : "ខេត្ត",
      district: language === "EN" ? "District" : "ស្រុក/ខណ្ឌ",
      commune: language === "EN" ? "Commune" : "ឃុំ/សង្កាត់",
      addressLine: language === "EN" ? "Address" : "អាសយដ្ឋាន",
      landmark: language === "EN" ? "Landmark (optional)" : "ចំណុចសម្គាល់ (ជម្រើស)",
      setAsDefault: language === "EN" ? "Set as default address" : "កំណត់ជាអាសយដ្ឋានលំនាំដើម",
      save: language === "EN" ? "Save" : "រក្សាទុក",
      cancel: language === "EN" ? "Cancel" : "បោះបង់",
    },
    wishlist: {
      empty: language === "EN" ? "Your wishlist is empty" : "បញ្ជីប្រាថ្នារបស់អ្នកគឺទទេ",
      emptyDesc: language === "EN" ? "Save items you love for later" : "រក្សាទុកទំនិញដែលអ្នកចូលចិត្តសម្រាប់ពេលក្រោយ",
      viewAll: language === "EN" ? "View Wishlist" : "មើលបញ្ជីប្រាថ្នា",
    },
    recentlyViewed: {
      empty: language === "EN" ? "No recently viewed products" : "មិនមានផលិតផលដែលបានមើលថ្មីៗទេ",
      emptyDesc: language === "EN" ? "Products you view will appear here" : "ផលិតផលដែលអ្នកមើលនឹងបង្ហាញនៅទីនេះ",
    },
    loyalty: {
      empty: language === "EN" ? "Join our loyalty program" : "ចូលរួមកម្មវិធីភក្ដីភាពរបស់យើង",
      emptyDesc: language === "EN" ? "Earn points with every purchase" : "ទទួលបានពិន្ទុជាមួយរាល់ការទិញ",
    },
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <User className="h-8 w-8" />
          {accountT.title}
        </h1>
        {customerName && (
          <p className="text-muted-foreground mt-1">
            {accountT.welcome}, {customerName}!
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("orders")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{accountT.tabs.orders}</p>
              <p className="text-xl font-bold">{orders.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("addresses")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{accountT.tabs.addresses}</p>
              <p className="text-xl font-bold">{addresses.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("wishlist")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <Heart className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{accountT.tabs.wishlist}</p>
              <p className="text-xl font-bold">{wishlistCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("loyalty")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100">
              <Award className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{accountT.tabs.loyalty}</p>
              <p className="text-xl font-bold">
                {loyaltyData?.account?.currentPoints?.toLocaleString() || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="orders" className="gap-2">
            <Package className="h-4 w-4 hidden sm:block" />
            {accountT.tabs.orders}
          </TabsTrigger>
          <TabsTrigger value="addresses" className="gap-2">
            <MapPin className="h-4 w-4 hidden sm:block" />
            {accountT.tabs.addresses}
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="gap-2">
            <Heart className="h-4 w-4 hidden sm:block" />
            {accountT.tabs.wishlist}
          </TabsTrigger>
          <TabsTrigger value="recentlyViewed" className="gap-2">
            <Clock className="h-4 w-4 hidden sm:block" />
            {accountT.tabs.recentlyViewed}
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-2">
            <Award className="h-4 w-4 hidden sm:block" />
            {accountT.tabs.loyalty}
          </TabsTrigger>
        </TabsList>

        {/* Order History Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>{accountT.tabs.orders}</CardTitle>
              <CardDescription>
                {language === "EN"
                  ? "View your past orders and reorder items you love"
                  : "មើលការបញ្ជាទិញកន្លងមក និងបញ្ជាទិញម្ដងទៀតនូវមុខទំនិញដែលអ្នកចូលចិត្ត"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">{accountT.orders.empty}</h3>
                  <p className="text-muted-foreground mb-4">{accountT.orders.emptyDesc}</p>
                  <Link href="/shop">
                    <Button className="gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      {language === "EN" ? "Start Shopping" : "ចាប់ផ្តើមទិញ"}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:border-primary transition-colors"
                    >
                      <div className="flex-1 mb-3 sm:mb-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold">#{order.orderNumber}</span>
                          <Badge className={statusColors[order.status]}>
                            {getStatusText(order.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)} • {order.items?.length || 0}{" "}
                          {accountT.orders.items}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          {accountT.orders.total}: {formatPrice(order.totalUsd, order.totalKhr)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/shop/orders/${order.id}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            {accountT.orders.viewDetails}
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                        {(order.status === "COMPLETED" || order.status === "CANCELLED") && (
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => handleReorder(order)}
                            disabled={reorderingId === order.id}
                          >
                            {reorderingId === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            {accountT.orders.reorder}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saved Addresses Tab */}
        <TabsContent value="addresses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{accountT.tabs.addresses}</CardTitle>
                <CardDescription>
                  {language === "EN"
                    ? "Manage your delivery addresses"
                    : "គ្រប់គ្រងអាសយដ្ឋានដឹកជញ្ជូនរបស់អ្នក"}
                </CardDescription>
              </div>
              <Button onClick={openAddAddressDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                {accountT.addresses.addNew}
              </Button>
            </CardHeader>
            <CardContent>
              {addressesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <Skeleton className="h-5 w-24 mb-2" />
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">{accountT.addresses.empty}</h3>
                  <p className="text-muted-foreground mb-4">{accountT.addresses.emptyDesc}</p>
                  <Button onClick={openAddAddressDialog} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {accountT.addresses.addNew}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`p-4 border rounded-lg relative ${
                        address.isDefault ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {address.label?.toLowerCase() === "home" ? (
                            <Home className="h-4 w-4 text-muted-foreground" />
                          ) : address.label?.toLowerCase() === "work" ? (
                            <Building className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">
                            {address.label || accountT.addresses.labels.other}
                          </span>
                          {address.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              {accountT.addresses.default}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditAddressDialog(address)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAddress(address.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="font-medium">{address.fullName}</p>
                      <p className="text-sm text-muted-foreground">{address.phone}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {address.addressLine}
                        {address.commune && `, ${address.commune}`}
                        {address.district && `, ${address.district}`}
                        {address.province && `, ${address.province}`}
                      </p>
                      {address.landmark && (
                        <p className="text-sm text-muted-foreground italic mt-1">
                          {language === "EN" ? "Near" : "ជិត"}: {address.landmark}
                        </p>
                      )}
                      {!address.isDefault && (
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-2 p-0 h-auto text-primary"
                          onClick={() => handleSetDefaultAddress(address.id)}
                        >
                          {accountT.addresses.setDefault}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wishlist Tab */}
        <TabsContent value="wishlist">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  {accountT.tabs.wishlist}
                </CardTitle>
                <CardDescription>
                  {wishlistCount} {accountT.orders.items}
                </CardDescription>
              </div>
              {wishlistCount > 0 && (
                <Link href="/shop/wishlist">
                  <Button variant="outline" className="gap-2">
                    {accountT.wishlist.viewAll}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {wishlistLoading || !wishlistFetched ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border rounded-lg">
                      <Skeleton className="aspect-square" />
                      <div className="p-3">
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : wishlistCount === 0 ? (
                <div className="text-center py-12">
                  <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">{accountT.wishlist.empty}</h3>
                  <p className="text-muted-foreground mb-4">{accountT.wishlist.emptyDesc}</p>
                  <Link href="/shop">
                    <Button className="gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      {language === "EN" ? "Browse Products" : "រុករកផលិតផល"}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {wishlistItems.slice(0, 4).map((item) => {
                    const name = language === "EN" ? item.product.nameEn : item.product.nameKh

                    return (
                      <Link
                        key={item.id}
                        href={`/shop/product/${item.product.id}`}
                        className="border rounded-lg overflow-hidden hover:border-primary transition-colors"
                      >
                        <div className="aspect-square overflow-hidden bg-muted">
                          <img
                            src={item.product.imageUrl || "/placeholder.svg"}
                            alt={name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-sm line-clamp-2">{name}</h4>
                          <p className="text-primary font-bold mt-1">
                            {formatPrice(Number(item.product.priceUsd), Number(item.product.priceKhr))}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recently Viewed Tab */}
        <TabsContent value="recentlyViewed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {accountT.tabs.recentlyViewed}
              </CardTitle>
              <CardDescription>
                {recentlyViewedCount} {accountT.orders.items}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentlyViewedCount === 0 ? (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">{accountT.recentlyViewed.empty}</h3>
                  <p className="text-muted-foreground mb-4">{accountT.recentlyViewed.emptyDesc}</p>
                  <Link href="/shop">
                    <Button className="gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      {language === "EN" ? "Browse Products" : "រុករកផលិតផល"}
                    </Button>
                  </Link>
                </div>
              ) : (
                <RecentlyViewed
                  language={language}
                  currency={currency}
                  maxDisplay={8}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loyalty Points Tab */}
        <TabsContent value="loyalty">
          {loyaltyLoading ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : loyaltyData?.account ? (
            <LoyaltyPointsCard
              customerId={customerId}
              language={language}
              currency={currency}
              showHistory={true}
            />
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Award className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">{accountT.loyalty.empty}</h3>
                  <p className="text-muted-foreground mb-4">{accountT.loyalty.emptyDesc}</p>
                  <Link href="/shop">
                    <Button className="gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      {language === "EN" ? "Start Earning Points" : "ចាប់ផ្តើមទទួលពិន្ទុ"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Address Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddress
                ? language === "EN"
                  ? "Edit Address"
                  : "កែសម្រួលអាសយដ្ឋាន"
                : accountT.addresses.addNew}
            </DialogTitle>
            <DialogDescription>
              {language === "EN"
                ? "Enter your delivery address details"
                : "បញ្ចូលព័ត៌មានលម្អិតអាសយដ្ឋានដឹកជញ្ជូនរបស់អ្នក"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">{accountT.addressForm.label}</Label>
              <Input
                id="label"
                placeholder={language === "EN" ? "e.g., Home, Work" : "ឧ. ផ្ទះ, ការិយាល័យ"}
                value={addressForm.label}
                onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{accountT.addressForm.fullName} *</Label>
                <Input
                  id="fullName"
                  value={addressForm.fullName}
                  onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{accountT.addressForm.phone} *</Label>
                <Input
                  id="phone"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="province">{accountT.addressForm.province}</Label>
                <Input
                  id="province"
                  value={addressForm.province}
                  onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">{accountT.addressForm.district}</Label>
                <Input
                  id="district"
                  value={addressForm.district}
                  onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commune">{accountT.addressForm.commune}</Label>
                <Input
                  id="commune"
                  value={addressForm.commune}
                  onChange={(e) => setAddressForm({ ...addressForm, commune: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine">{accountT.addressForm.addressLine} *</Label>
              <Input
                id="addressLine"
                placeholder={
                  language === "EN"
                    ? "Street address, house number"
                    : "អាសយដ្ឋានផ្លូវ, លេខផ្ទះ"
                }
                value={addressForm.addressLine}
                onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="landmark">{accountT.addressForm.landmark}</Label>
              <Input
                id="landmark"
                placeholder={
                  language === "EN"
                    ? "Near hospital, opposite market, etc."
                    : "ជិតមន្ទីរពេទ្យ, ផ្ទុយពីផ្សារ, ។ល។"
                }
                value={addressForm.landmark}
                onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={addressForm.isDefault}
                onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isDefault" className="text-sm font-normal">
                {accountT.addressForm.setAsDefault}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddressDialog(false)}>
              {accountT.addressForm.cancel}
            </Button>
            <Button
              onClick={handleSaveAddress}
              disabled={
                addressSaving ||
                !addressForm.fullName.trim() ||
                !addressForm.phone.trim() ||
                !addressForm.addressLine.trim()
              }
            >
              {addressSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {accountT.addressForm.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
