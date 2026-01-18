"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Users,
  Crown,
  Activity,
  UserPlus,
  AlertTriangle,
  UserX,
  Pause,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  TrendingUp,
  PieChart as PieChartIcon,
  Calculator,
  ChevronRight,
  Zap,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
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

interface Segment {
  id: string
  name: string
  nameKh: string | null
  description: string | null
  type: "AUTO" | "CUSTOM"
  rfmConfig: {
    recencyDays?: number
    frequencyMin?: number
    monetaryMin?: number
  } | null
  filterRules: Array<{
    field: string
    operator: string
    value: string | number | boolean
  }> | null
  color: string
  icon: string | null
  customerCount: number
  totalRevenue: number
  lastCalculatedAt: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  memberships?: Array<{
    id: string
    customer: {
      id: string
      name: string
      email: string | null
      phone: string
    }
    recencyScore: number | null
    frequencyScore: number | null
    monetaryScore: number | null
    rfmTotal: number | null
    lastOrderDays: number | null
    totalOrders: number | null
    totalSpent: number | null
    assignedAt: string
  }>
}

interface SegmentsResponse {
  segments: Segment[]
  stats: {
    totalSegments: number
    totalCustomers: number
    segmentedCustomers: number
    unsegmentedCustomers: number
  }
}

const segmentIcons: Record<string, React.ReactNode> = {
  crown: <Crown className="w-4 h-4" />,
  activity: <Activity className="w-4 h-4" />,
  "user-plus": <UserPlus className="w-4 h-4" />,
  "alert-triangle": <AlertTriangle className="w-4 h-4" />,
  "user-x": <UserX className="w-4 h-4" />,
  pause: <Pause className="w-4 h-4" />,
}

const colorOptions = [
  { value: "#eab308", label: "Gold" },
  { value: "#22c55e", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#f97316", label: "Orange" },
  { value: "#ef4444", label: "Red" },
  { value: "#6b7280", label: "Gray" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
]

export function CustomerSegmentsPage() {
  const { toast } = useToast()
  const [data, setData] = useState<SegmentsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state for edit/create
  const [formData, setFormData] = useState({
    name: "",
    nameKh: "",
    description: "",
    type: "CUSTOM" as "AUTO" | "CUSTOM",
    color: "#3b82f6",
    icon: "",
    isActive: true,
    sortOrder: 0,
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/segments?includeMembers=false")
      if (!response.ok) throw new Error("Failed to fetch")
      const json = await response.json()
      setData(json)
    } catch {
      toast({
        title: "Error",
        description: "Failed to load segments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSegmentDetails = async (segmentId: string) => {
    try {
      const response = await fetch(`/api/segments?includeMembers=true`)
      if (!response.ok) throw new Error("Failed to fetch")
      const json: SegmentsResponse = await response.json()
      const segment = json.segments.find(s => s.id === segmentId)
      if (segment) {
        setSelectedSegment(segment)
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load segment details",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSeedDefaultSegments = async () => {
    try {
      const response = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_default_segments" }),
      })
      if (!response.ok) throw new Error("Failed")
      toast({ title: "Success", description: "Default segments created" })
      fetchData()
    } catch {
      toast({ title: "Error", description: "Failed to create segments", variant: "destructive" })
    }
  }

  const handleCalculateRFM = async () => {
    setCalculating(true)
    try {
      const response = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "calculate_rfm" }),
      })
      if (!response.ok) throw new Error("Failed")
      const result = await response.json()
      toast({
        title: "Success",
        description: `RFM calculated for ${result.processed} customers`,
      })
      fetchData()
    } catch {
      toast({ title: "Error", description: "Failed to calculate RFM", variant: "destructive" })
    } finally {
      setCalculating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const isEdit = !!selectedSegment?.id
      const response = await fetch("/api/segments", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: selectedSegment.id, ...formData } : formData),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed")
      }
      toast({ title: "Success", description: `Segment ${isEdit ? "updated" : "created"}` })
      setShowEditDialog(false)
      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save segment",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSegment) return
    setSaving(true)
    try {
      const response = await fetch(`/api/segments?id=${selectedSegment.id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed")
      toast({ title: "Success", description: "Segment deleted" })
      setShowDeleteDialog(false)
      setSelectedSegment(null)
      fetchData()
    } catch {
      toast({ title: "Error", description: "Failed to delete segment", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const openEditDialog = (segment?: Segment) => {
    if (segment) {
      setSelectedSegment(segment)
      setFormData({
        name: segment.name,
        nameKh: segment.nameKh || "",
        description: segment.description || "",
        type: segment.type,
        color: segment.color,
        icon: segment.icon || "",
        isActive: segment.isActive,
        sortOrder: segment.sortOrder,
      })
    } else {
      setSelectedSegment(null)
      setFormData({
        name: "",
        nameKh: "",
        description: "",
        type: "CUSTOM",
        color: "#3b82f6",
        icon: "",
        isActive: true,
        sortOrder: 0,
      })
    }
    setShowEditDialog(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value)
  }

  const stats = data?.stats
  const segments = data?.segments || []

  // Prepare data for pie chart
  const pieData = segments.map(s => ({
    name: s.name,
    value: s.customerCount,
    color: s.color,
  }))

  if (loading) {
    return (
      <AdminLoading
        title="Customer Segmentation"
        subtitle="Group customers for targeted marketing using RFM analysis"
        rows={5}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Customer Segmentation"
        subtitle="Group customers for targeted marketing using RFM analysis"
      >
        <Button onClick={handleSeedDefaultSegments} variant="outline" size="sm">
          <Zap className="w-4 h-4 mr-2" />
          Seed Defaults
        </Button>
        <Button
          onClick={handleCalculateRFM}
          variant="outline"
          size="sm"
          disabled={calculating}
        >
          {calculating ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Calculator className="w-4 h-4 mr-2" />
          )}
          Calculate RFM
        </Button>
        <Button onClick={() => openEditDialog()} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Segment
        </Button>
      </AdminPageHeader>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminDataCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Segments</p>
                <p className="text-2xl font-bold">{stats.totalSegments}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <PieChartIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </AdminDataCard>

          <AdminDataCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <Users className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </AdminDataCard>

          <AdminDataCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Segmented</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.segmentedCustomers}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.totalCustomers > 0
                ? Math.round((stats.segmentedCustomers / stats.totalCustomers) * 100)
                : 0}% coverage
            </p>
          </AdminDataCard>

          <AdminDataCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unsegmented</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.unsegmentedCustomers}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Needs RFM calculation
            </p>
          </AdminDataCard>
        </div>
      )}

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Segment List</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        {/* Segment List Tab */}
        <TabsContent value="list" className="space-y-4">
          <AdminDataCard>
            {segments.length === 0 ? (
              <div className="text-center py-8">
                <AdminEmptyState message="No segments found" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedDefaultSegments}
                  className="mt-4"
                >
                  Create Default Segments
                </Button>
              </div>
            ) : (
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableHeadRow>
                    <AdminTableHead>Segment</AdminTableHead>
                    <AdminTableHead>Type</AdminTableHead>
                    <AdminTableHead className="text-center">Customers</AdminTableHead>
                    <AdminTableHead className="text-right">Total Revenue</AdminTableHead>
                    <AdminTableHead>Status</AdminTableHead>
                    <AdminTableHead className="text-right">Actions</AdminTableHead>
                  </AdminTableHeadRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {segments.map((segment) => (
                    <AdminTableRow key={segment.id}>
                      <AdminTableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: segment.color }}
                          >
                            {segment.icon && segmentIcons[segment.icon]
                              ? segmentIcons[segment.icon]
                              : <Users className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium">{segment.name}</p>
                            {segment.nameKh && (
                              <p className="text-sm text-muted-foreground">
                                {segment.nameKh}
                              </p>
                            )}
                          </div>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <AdminBadge variant={segment.type === "AUTO" ? "default" : "outline"}>
                          {segment.type}
                        </AdminBadge>
                      </AdminTableCell>
                      <AdminTableCell className="text-center">
                        <span className="font-bold">{segment.customerCount}</span>
                      </AdminTableCell>
                      <AdminTableCell className="text-right font-medium">
                        {formatCurrency(segment.totalRevenue)}
                      </AdminTableCell>
                      <AdminTableCell>
                        <AdminBadge variant={segment.isActive ? "default" : "secondary"}>
                          {segment.isActive ? "Active" : "Inactive"}
                        </AdminBadge>
                      </AdminTableCell>
                      <AdminTableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await fetchSegmentDetails(segment.id)
                              setShowDetailDialog(true)
                            }}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(segment)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSegment(segment)
                              setShowDeleteDialog(true)
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            )}
          </AdminDataCard>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Distribution</CardTitle>
                <CardDescription>Customers per segment</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <AdminEmptyState message="No segment data available" />
                )}
              </CardContent>
            </Card>

            {/* Revenue by Segment */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Segment</CardTitle>
                <CardDescription>Total revenue contribution</CardDescription>
              </CardHeader>
              <CardContent>
                {segments.length > 0 ? (
                  <div className="space-y-4">
                    {segments
                      .sort((a, b) => b.totalRevenue - a.totalRevenue)
                      .map((segment) => {
                        const totalRevenue = segments.reduce((sum, s) => sum + s.totalRevenue, 0)
                        const percentage = totalRevenue > 0
                          ? Math.round((segment.totalRevenue / totalRevenue) * 100)
                          : 0
                        return (
                          <div key={segment.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: segment.color }}
                                />
                                {segment.name}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(segment.totalRevenue)} ({percentage}%)
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: segment.color,
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <AdminEmptyState message="No segment data available" />
                )}
              </CardContent>
            </Card>

            {/* RFM Score Legend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>RFM Scoring Guide</CardTitle>
                <CardDescription>
                  How customers are scored and segmented
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 text-xs font-bold">
                        R
                      </div>
                      Recency
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Days since last order
                    </p>
                    <ul className="text-sm space-y-1">
                      <li>5: 0-7 days</li>
                      <li>4: 8-30 days</li>
                      <li>3: 31-60 days</li>
                      <li>2: 61-90 days</li>
                      <li>1: 90+ days</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 text-xs font-bold">
                        F
                      </div>
                      Frequency
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Total number of orders
                    </p>
                    <ul className="text-sm space-y-1">
                      <li>5: 10+ orders</li>
                      <li>4: 5-9 orders</li>
                      <li>3: 3-4 orders</li>
                      <li>2: 2 orders</li>
                      <li>1: 1 order</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-yellow-600 text-xs font-bold">
                        M
                      </div>
                      Monetary
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Total amount spent (USD)
                    </p>
                    <ul className="text-sm space-y-1">
                      <li>5: $500+</li>
                      <li>4: $200-$499</li>
                      <li>3: $100-$199</li>
                      <li>2: $50-$99</li>
                      <li>1: $0-$49</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Segment Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedSegment && (
                <>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: selectedSegment.color }}
                  >
                    {selectedSegment.icon && segmentIcons[selectedSegment.icon]
                      ? segmentIcons[selectedSegment.icon]
                      : <Users className="w-4 h-4" />}
                  </div>
                  {selectedSegment.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedSegment?.description || "Segment members and details"}
            </DialogDescription>
          </DialogHeader>
          {selectedSegment && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedSegment.customerCount}</p>
                  <p className="text-sm text-muted-foreground">Customers</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{formatCurrency(selectedSegment.totalRevenue)}</p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">
                    {selectedSegment.customerCount > 0
                      ? formatCurrency(selectedSegment.totalRevenue / selectedSegment.customerCount)
                      : "$0"}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Revenue</p>
                </div>
              </div>

              {selectedSegment.memberships && selectedSegment.memberships.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Members ({selectedSegment.memberships.length})</h4>
                  <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                    <AdminTable>
                      <AdminTableHeader>
                        <AdminTableHeadRow>
                          <AdminTableHead>Customer</AdminTableHead>
                          <AdminTableHead className="text-center">RFM</AdminTableHead>
                          <AdminTableHead className="text-right">Spent</AdminTableHead>
                          <AdminTableHead className="text-right">Orders</AdminTableHead>
                        </AdminTableHeadRow>
                      </AdminTableHeader>
                      <AdminTableBody>
                        {selectedSegment.memberships.map((m) => (
                          <AdminTableRow key={m.id}>
                            <AdminTableCell>
                              <div>
                                <p className="font-medium">{m.customer.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {m.customer.email || m.customer.phone}
                                </p>
                              </div>
                            </AdminTableCell>
                            <AdminTableCell className="text-center">
                              <div className="flex gap-1 justify-center">
                                <AdminBadge variant="outline">
                                  R:{m.recencyScore || "-"}
                                </AdminBadge>
                                <AdminBadge variant="outline">
                                  F:{m.frequencyScore || "-"}
                                </AdminBadge>
                                <AdminBadge variant="outline">
                                  M:{m.monetaryScore || "-"}
                                </AdminBadge>
                              </div>
                            </AdminTableCell>
                            <AdminTableCell className="text-right">
                              {m.totalSpent ? formatCurrency(Number(m.totalSpent)) : "-"}
                            </AdminTableCell>
                            <AdminTableCell className="text-right">
                              {m.totalOrders || 0}
                            </AdminTableCell>
                          </AdminTableRow>
                        ))}
                      </AdminTableBody>
                    </AdminTable>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSegment ? "Edit Segment" : "Create Segment"}
            </DialogTitle>
            <DialogDescription>
              {selectedSegment ? "Update segment details" : "Create a new customer segment"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name (English)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Premium"
                />
              </div>
              <div>
                <Label htmlFor="nameKh">Name (Khmer)</Label>
                <Input
                  id="nameKh"
                  value={formData.nameKh}
                  onChange={(e) => setFormData({ ...formData, nameKh: e.target.value })}
                  placeholder="e.g., អតិថិជនពិសេស"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this segment..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as "AUTO" | "CUSTOM" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">Auto (RFM-based)</SelectItem>
                    <SelectItem value="CUSTOM">Custom (Manual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(v) => setFormData({ ...formData, color: v })}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: formData.color }}
                      />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: c.value }}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-20"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedSegment ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Segment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedSegment?.name}&quot;? This will remove all
              customer memberships in this segment. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
