"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  useInfluencers,
  useInfluencerDashboard,
  useInfluencerDetail,
  useInfluencerStats,
  useInfluencerSales,
  useInfluencerPayouts,
  useCreateInfluencer,
  useUpdateInfluencer,
  useDeleteInfluencer,
  useApproveInfluencerSale,
  useRejectInfluencerSale,
  useCreateInfluencerPayout,
  useProcessInfluencerPayout,
  type Influencer,
  type InfluencerTier,
  type PayoutMethod,
  type InfluencersParams,
} from "@/lib/api-hooks"
import { translations, type Language } from "@/lib/i18n"
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  Award,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  Wallet,
  BarChart3,
  Instagram,
  MessageCircle,
  Facebook,
  Search,
  ShoppingBag,
  CreditCard,
  Percent,
  Link2,
} from "lucide-react"

// Tier badge colors
const tierColors: Record<InfluencerTier, string> = {
  STANDARD: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  BRONZE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  SILVER: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  GOLD: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PLATINUM: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
}

// Status badge colors
const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  PAID: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PROCESSING: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

const payoutMethodLabels: Record<PayoutMethod, string> = {
  BANK_TRANSFER: "Bank Transfer",
  PAYPAL: "PayPal",
  WING: "Wing",
  ABA_BANK: "ABA Bank",
  CASH: "Cash",
}

interface InfluencersPageProps {
  language?: Language
}

export function InfluencersPage({ language = "en" }: InfluencersPageProps) {
  const t = translations[language === "en" ? "en" : "kh"].influencers

  // State
  const [params, setParams] = useState<InfluencersParams>({ page: 1, limit: 10 })
  const [searchQuery, setSearchQuery] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false)
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null)
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "sales" | "payouts">("overview")
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    tier: "STANDARD" as InfluencerTier,
    commissionRate: 10,
    payoutMethod: "BANK_TRANSFER" as PayoutMethod,
    notes: "",
    socialPlatforms: {} as Record<string, string>,
  })

  const [payoutPeriod, setPayoutPeriod] = useState({
    startDate: "",
    endDate: "",
  })

  // Query hooks
  const { data: dashboardData, isLoading: dashboardLoading } = useInfluencerDashboard()
  const { data: influencersData, isLoading: influencersLoading } = useInfluencers({
    ...params,
    search: searchQuery || undefined,
  })
  const { data: influencerDetail } = useInfluencerDetail(selectedInfluencerId)
  const { data: influencerStats } = useInfluencerStats(selectedInfluencerId)
  const { data: salesData } = useInfluencerSales(selectedInfluencerId, { limit: 10 })
  const { data: payoutsData } = useInfluencerPayouts(selectedInfluencerId, { limit: 10 })

  // Mutation hooks
  const createMutation = useCreateInfluencer()
  const updateMutation = useUpdateInfluencer()
  const deleteMutation = useDeleteInfluencer()
  const approveSaleMutation = useApproveInfluencerSale()
  const rejectSaleMutation = useRejectInfluencerSale()
  const createPayoutMutation = useCreateInfluencerPayout()
  const processPayoutMutation = useProcessInfluencerPayout()

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setParams(p => ({ ...p, page: 1 }))
  }

  const handleCreate = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      tier: "STANDARD",
      commissionRate: 10,
      payoutMethod: "BANK_TRANSFER",
      notes: "",
      socialPlatforms: {},
    })
    setCreateDialogOpen(true)
  }

  const handleEdit = (influencer: Influencer) => {
    setSelectedInfluencer(influencer)
    setFormData({
      name: influencer.name,
      email: influencer.email,
      phone: influencer.phone || "",
      tier: influencer.tier,
      commissionRate: influencer.commissionRate,
      payoutMethod: influencer.payoutMethod,
      notes: influencer.notes || "",
      socialPlatforms: influencer.socialPlatforms || {},
    })
    setEditDialogOpen(true)
  }

  const handleViewDetails = (influencer: Influencer) => {
    setSelectedInfluencerId(influencer.id)
    setActiveTab("overview")
    setDetailDialogOpen(true)
  }

  const handleDelete = (influencer: Influencer) => {
    setSelectedInfluencer(influencer)
    setDeleteDialogOpen(true)
  }

  const handleCreatePayout = (influencer: Influencer) => {
    setSelectedInfluencer(influencer)
    const today = new Date()
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    setPayoutPeriod({
      startDate: firstOfMonth.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    })
    setPayoutDialogOpen(true)
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleSubmitCreate = async () => {
    try {
      await createMutation.mutateAsync(formData)
      setCreateDialogOpen(false)
    } catch (err) {
      console.error("Failed to create influencer:", err)
    }
  }

  const handleSubmitEdit = async () => {
    if (!selectedInfluencer) return
    try {
      await updateMutation.mutateAsync({
        id: selectedInfluencer.id,
        ...formData,
      })
      setEditDialogOpen(false)
    } catch (err) {
      console.error("Failed to update influencer:", err)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedInfluencer) return
    try {
      await deleteMutation.mutateAsync(selectedInfluencer.id)
      setDeleteDialogOpen(false)
    } catch (err) {
      console.error("Failed to delete influencer:", err)
    }
  }

  const handleSubmitPayout = async () => {
    if (!selectedInfluencer) return
    try {
      await createPayoutMutation.mutateAsync({
        influencerId: selectedInfluencer.id,
        periodStart: payoutPeriod.startDate,
        periodEnd: payoutPeriod.endDate,
      })
      setPayoutDialogOpen(false)
    } catch (err) {
      console.error("Failed to create payout:", err)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === "en" ? "en-US" : "km-KH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </Card>
          ))
        ) : (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalInfluencers}</p>
                  <p className="text-2xl font-bold">{dashboardData?.totalInfluencers || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData?.activeInfluencers || 0} {t.active}
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalSales}</p>
                  <p className="text-2xl font-bold">{formatCurrency(dashboardData?.totalSales || 0)}</p>
                  <p className="text-xs text-green-600">
                    {formatCurrency(dashboardData?.thisMonthSales || 0)} {t.thisMonth}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalCommission}</p>
                  <p className="text-2xl font-bold">{formatCurrency(dashboardData?.totalCommission || 0)}</p>
                  <p className="text-xs text-green-600">
                    {formatCurrency(dashboardData?.thisMonthCommission || 0)} {t.thisMonth}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.pendingPayouts}</p>
                  <p className="text-2xl font-bold">{formatCurrency(dashboardData?.pendingPayoutAmount || 0)}</p>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData?.pendingPayouts || 0} {t.payoutsToProcess}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Top Influencers */}
      {dashboardData?.topInfluencers && dashboardData.topInfluencers.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" />
            {t.topInfluencers}
          </h3>
          <div className="grid gap-4 md:grid-cols-5">
            {dashboardData.topInfluencers.map((inf, index) => (
              <div
                key={inf.id}
                className="p-4 border rounded-lg flex items-center gap-3"
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted font-bold text-sm">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{inf.name}</p>
                  <p className="text-xs text-muted-foreground">{inf.affiliateCode}</p>
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(inf.totalSales)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Influencers List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t.influencers}
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={handleSearch}
                className="pl-9 w-64"
              />
            </div>
            <Select
              value={params.tier || "all"}
              onValueChange={(v) => setParams(p => ({ ...p, tier: v === "all" ? undefined : v as InfluencerTier, page: 1 }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t.allTiers} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allTiers}</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="BRONZE">Bronze</SelectItem>
                <SelectItem value="SILVER">Silver</SelectItem>
                <SelectItem value="GOLD">Gold</SelectItem>
                <SelectItem value="PLATINUM">Platinum</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t.addInfluencer}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">{t.name}</th>
                <th className="px-4 py-3 text-left text-sm font-medium">{t.affiliateCode}</th>
                <th className="px-4 py-3 text-left text-sm font-medium">{t.tier}</th>
                <th className="px-4 py-3 text-right text-sm font-medium">{t.commission}</th>
                <th className="px-4 py-3 text-right text-sm font-medium">{t.totalSales}</th>
                <th className="px-4 py-3 text-right text-sm font-medium">{t.pendingPayout}</th>
                <th className="px-4 py-3 text-left text-sm font-medium">{t.status}</th>
                <th className="px-4 py-3 text-right text-sm font-medium">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {influencersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  </tr>
                ))
              ) : influencersData?.influencers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {t.noInfluencers}
                  </td>
                </tr>
              ) : (
                influencersData?.influencers.map((inf) => (
                  <tr key={inf.id} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{inf.name}</p>
                        <p className="text-xs text-muted-foreground">{inf.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          {inf.affiliateCode}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(inf.affiliateCode)}
                        >
                          {copiedCode === inf.affiliateCode ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={tierColors[inf.tier]}>
                        {inf.tier}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium">{inf.commissionRate}%</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(inf.totalSales)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inf.pendingPayout > 0 ? (
                        <span className="font-medium text-green-600">
                          {formatCurrency(inf.pendingPayout)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">$0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inf.isActive ? "default" : "secondary"}>
                        {inf.isActive ? t.active : t.inactive}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(inf)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(inf)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {inf.pendingPayout >= 50 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreatePayout(inf)}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(inf)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {influencersData && influencersData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {t.showing} {((params.page || 1) - 1) * (params.limit || 10) + 1} -{" "}
              {Math.min((params.page || 1) * (params.limit || 10), influencersData.pagination.totalCount)}{" "}
              {t.of} {influencersData.pagination.totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParams(p => ({ ...p, page: (p.page || 1) - 1 }))}
                disabled={!params.page || params.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {params.page || 1} / {influencersData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParams(p => ({ ...p, page: (p.page || 1) + 1 }))}
                disabled={(params.page || 1) >= influencersData.pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.addInfluencer}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.name}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>{t.email}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label>{t.phone}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                placeholder="+855 12 345 678"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.tier}</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(v) => setFormData(f => ({ ...f, tier: v as InfluencerTier }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="BRONZE">Bronze</SelectItem>
                    <SelectItem value="SILVER">Silver</SelectItem>
                    <SelectItem value="GOLD">Gold</SelectItem>
                    <SelectItem value="PLATINUM">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.commissionRate}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.commissionRate}
                    onChange={(e) => setFormData(f => ({ ...f, commissionRate: Number(e.target.value) }))}
                    min={0}
                    max={100}
                    className="pr-8"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div>
              <Label>{t.payoutMethod}</Label>
              <Select
                value={formData.payoutMethod}
                onValueChange={(v) => setFormData(f => ({ ...f, payoutMethod: v as PayoutMethod }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="PAYPAL">PayPal</SelectItem>
                  <SelectItem value="WING">Wing</SelectItem>
                  <SelectItem value="ABA_BANK">ABA Bank</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.notes}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                placeholder={t.notesPlaceholder}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={handleSubmitCreate}
              disabled={createMutation.isPending || !formData.name || !formData.email}
            >
              {createMutation.isPending ? t.creating : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.editInfluencer}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.name}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t.email}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t.phone}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.tier}</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(v) => setFormData(f => ({ ...f, tier: v as InfluencerTier }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="BRONZE">Bronze</SelectItem>
                    <SelectItem value="SILVER">Silver</SelectItem>
                    <SelectItem value="GOLD">Gold</SelectItem>
                    <SelectItem value="PLATINUM">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.commissionRate}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.commissionRate}
                    onChange={(e) => setFormData(f => ({ ...f, commissionRate: Number(e.target.value) }))}
                    min={0}
                    max={100}
                    className="pr-8"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div>
              <Label>{t.payoutMethod}</Label>
              <Select
                value={formData.payoutMethod}
                onValueChange={(v) => setFormData(f => ({ ...f, payoutMethod: v as PayoutMethod }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="PAYPAL">PayPal</SelectItem>
                  <SelectItem value="WING">Wing</SelectItem>
                  <SelectItem value="ABA_BANK">ABA Bank</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.notes}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? t.saving : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {influencerDetail?.name || t.influencerDetails}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "overview" | "sales" | "payouts")} className="flex-1 overflow-hidden">
            <TabsList>
              <TabsTrigger value="overview">{t.overview}</TabsTrigger>
              <TabsTrigger value="sales">{t.sales}</TabsTrigger>
              <TabsTrigger value="payouts">{t.payouts}</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="overview" className="mt-0">
                {influencerDetail && influencerStats && (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid gap-4 md:grid-cols-4">
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">{t.totalSales}</p>
                        <p className="text-xl font-bold">{formatCurrency(influencerStats.totalSales)}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">{t.totalCommission}</p>
                        <p className="text-xl font-bold">{formatCurrency(influencerStats.totalCommission)}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">{t.totalOrders}</p>
                        <p className="text-xl font-bold">{influencerStats.totalOrders}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">{t.pendingPayout}</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(influencerStats.pendingPayout)}</p>
                      </Card>
                    </div>

                    {/* Affiliate Link */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Link2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t.affiliateLink}</p>
                            <code className="text-sm">{influencerDetail.affiliateLink}</code>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(influencerDetail.affiliateLink || "")}
                        >
                          {copiedCode === influencerDetail.affiliateLink ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <Copy className="h-4 w-4 mr-2" />
                          )}
                          {t.copy}
                        </Button>
                      </div>
                    </Card>

                    {/* Info Grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="p-4">
                        <h4 className="font-medium mb-3">{t.contactInfo}</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-muted-foreground">{t.email}:</span> {influencerDetail.email}</p>
                          <p><span className="text-muted-foreground">{t.phone}:</span> {influencerDetail.phone || "-"}</p>
                          <p><span className="text-muted-foreground">{t.joinedAt}:</span> {formatDate(influencerDetail.joinedAt)}</p>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <h4 className="font-medium mb-3">{t.commissionSettings}</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-muted-foreground">{t.tier}:</span> <Badge className={tierColors[influencerDetail.tier]}>{influencerDetail.tier}</Badge></p>
                          <p><span className="text-muted-foreground">{t.commissionRate}:</span> {influencerDetail.commissionRate}%</p>
                          <p><span className="text-muted-foreground">{t.payoutMethod}:</span> {payoutMethodLabels[influencerDetail.payoutMethod]}</p>
                          <p><span className="text-muted-foreground">{t.minPayout}:</span> {formatCurrency(influencerDetail.minPayoutAmount)}</p>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sales" className="mt-0">
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">{t.order}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">{t.date}</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">{t.orderTotal}</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">{t.commission}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">{t.status}</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData?.sales.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                              {t.noSales}
                            </td>
                          </tr>
                        ) : (
                          salesData?.sales.map((sale) => (
                            <tr key={sale.id} className="border-t">
                              <td className="px-4 py-3">
                                <p className="font-medium">{sale.orderNumber}</p>
                                {sale.customer && (
                                  <p className="text-xs text-muted-foreground">{sale.customer.name}</p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {formatDate(sale.saleDate)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                                {formatCurrency(sale.orderTotal)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-medium text-green-600">
                                  {formatCurrency(sale.commissionAmount)}
                                </span>
                                <p className="text-xs text-muted-foreground">{sale.commissionRate}%</p>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={statusColors[sale.status]}>
                                  {sale.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {sale.status === "PENDING" && (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => approveSaleMutation.mutate(sale.id)}
                                      disabled={approveSaleMutation.isPending}
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => rejectSaleMutation.mutate(sale.id)}
                                      disabled={rejectSaleMutation.isPending}
                                    >
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="payouts" className="mt-0">
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">{t.period}</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">{t.amount}</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">{t.salesCount}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">{t.method}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">{t.status}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">{t.paidAt}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payoutsData?.payouts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                              {t.noPayouts}
                            </td>
                          </tr>
                        ) : (
                          payoutsData?.payouts.map((payout) => (
                            <tr key={payout.id} className="border-t">
                              <td className="px-4 py-3 text-sm">
                                {formatDate(payout.periodStart)} - {formatDate(payout.periodEnd)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold">
                                {formatCurrency(payout.amount)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {payout.salesCount}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {payoutMethodLabels[payout.payoutMethod]}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={statusColors[payout.status]}>
                                  {payout.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {payout.paidAt ? formatDate(payout.paidAt) : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteConfirmDesc.replace("{name}", selectedInfluencer?.name || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t.deleting : t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Payout Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.createPayout}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t.createPayoutDesc.replace("{name}", selectedInfluencer?.name || "")}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.startDate}</Label>
                <Input
                  type="date"
                  value={payoutPeriod.startDate}
                  onChange={(e) => setPayoutPeriod(p => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t.endDate}</Label>
                <Input
                  type="date"
                  value={payoutPeriod.endDate}
                  onChange={(e) => setPayoutPeriod(p => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="text-muted-foreground">{t.pendingCommission}:</span>{" "}
                <span className="font-bold text-green-600">
                  {formatCurrency(selectedInfluencer?.pendingPayout || 0)}
                </span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={handleSubmitPayout}
              disabled={createPayoutMutation.isPending || !payoutPeriod.startDate || !payoutPeriod.endDate}
            >
              {createPayoutMutation.isPending ? t.creating : t.createPayout}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}