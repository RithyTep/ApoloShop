"use client"

import { useState, useCallback, useEffect } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  GripVertical,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Clock,
  AlertTriangle,
  Settings2,
  RefreshCw,
  Eye,
  EyeOff,
  ShoppingCart,
  BarChart3,
} from "lucide-react"
import {
  useDashboardStats,
  useDashboardLayout,
  useUpdateDashboardLayout,
  DashboardWidgetConfig,
  DashboardWidgetType,
  DashboardLayoutConfig,
  defaultDashboardWidgets,
  useLowStockItems,
  OrderStatus,
} from "@/lib/api-hooks"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Auto-refresh interval in milliseconds (5 minutes)
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000

// Widget metadata for labels and icons
const widgetMeta: Record<DashboardWidgetType, { label: string; icon: React.ReactNode; description: string }> = {
  sales_overview: {
    label: "Sales Overview",
    icon: <DollarSign className="h-4 w-4" />,
    description: "Revenue and order KPIs with trends",
  },
  recent_orders: {
    label: "Recent Orders",
    icon: <ShoppingCart className="h-4 w-4" />,
    description: "Latest orders with status",
  },
  low_stock: {
    label: "Low Stock Alerts",
    icon: <AlertTriangle className="h-4 w-4" />,
    description: "Products that need restocking",
  },
  top_products: {
    label: "Top Products",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Best selling products chart",
  },
}

// Sales Overview Widget Component
function SalesOverviewWidget({ data, isLoading }: { data?: ReturnType<typeof useDashboardStats>["data"]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    )
  }

  const kpis = data?.kpis
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`
  const formatKhr = (value: number) => `៛${value.toLocaleString()}`

  const kpiCards = [
    {
      label: "Today Orders",
      value: kpis?.todayOrders || 0,
      change: kpis?.ordersChange || 0,
      icon: Package,
      format: "number",
    },
    {
      label: "Revenue",
      value: kpis?.revenueUsd || 0,
      change: kpis?.revenueChange || 0,
      icon: DollarSign,
      format: "currency",
      khrValue: kpis?.revenueKhr || 0,
    },
    {
      label: "Pending Orders",
      value: kpis?.pendingOrders || 0,
      icon: Clock,
      format: "number",
      isWarning: (kpis?.pendingOrders || 0) > 0,
    },
    {
      label: "Low Stock Items",
      value: kpis?.lowStockItems || 0,
      icon: AlertTriangle,
      format: "number",
      isUrgent: (kpis?.lowStockItems || 0) > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpiCards.map((kpi, index) => {
        const Icon = kpi.icon
        return (
          <div key={index} className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">{kpi.label}</h3>
              <Icon className={`h-4 w-4 ${kpi.isUrgent ? "text-destructive" : kpi.isWarning ? "text-warning" : "text-muted-foreground"}`} />
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">
              {kpi.format === "currency" ? formatCurrency(kpi.value) : kpi.value}
            </p>
            {kpi.khrValue !== undefined && (
              <p className="text-sm text-muted-foreground">{formatKhr(kpi.khrValue)}</p>
            )}
            {kpi.change !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${kpi.change >= 0 ? "text-success" : "text-destructive"}`}>
                {kpi.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{kpi.change >= 0 ? "+" : ""}{kpi.change}% from yesterday</span>
              </div>
            )}
            {kpi.isWarning && <p className="text-xs text-warning mt-2">Need action</p>}
            {kpi.isUrgent && <p className="text-xs text-destructive mt-2">Urgent</p>}
          </div>
        )
      })}
    </div>
  )
}

// Recent Orders Widget Component
function RecentOrdersWidget({ data, isLoading }: { data?: ReturnType<typeof useDashboardStats>["data"]; isLoading: boolean }) {
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default"
      case "CANCELLED":
        return "destructive"
      case "NEW":
        return "secondary"
      default:
        return "outline"
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const recentOrders = data?.recentOrders || []

  if (recentOrders.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No recent orders
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border">
            <TableHead className="text-foreground font-semibold">Order</TableHead>
            <TableHead className="text-foreground font-semibold">Customer</TableHead>
            <TableHead className="text-foreground font-semibold">Amount</TableHead>
            <TableHead className="text-foreground font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentOrders.slice(0, 5).map((order) => (
            <TableRow key={order.id} className="border-b border-border hover:bg-muted/50">
              <TableCell className="text-foreground font-medium">{order.orderNumber}</TableCell>
              <TableCell className="text-foreground">{order.customer}</TableCell>
              <TableCell className="text-foreground">{formatCurrency(order.total)}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(order.status) as "default" | "destructive" | "secondary" | "outline"} className="rounded-sm">
                  {order.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Low Stock Widget Component
function LowStockWidget() {
  const { data, isLoading } = useLowStockItems()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  const lowStockItems = data?.inventory || []

  if (lowStockItems.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
        <Package className="h-8 w-8 text-success" />
        <p>All products well stocked!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {lowStockItems.slice(0, 10).map((item) => {
        const isCritical = item.quantity <= Math.floor(item.minLevel / 2)
        return (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              isCritical ? "bg-destructive/10" : "bg-warning/10"
            )}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className={cn("h-4 w-4", isCritical ? "text-destructive" : "text-warning")} />
              <div>
                <p className="text-sm font-medium text-foreground">{item.product.nameEn}</p>
                <p className="text-xs text-muted-foreground">SKU: {item.product.sku}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn("text-sm font-bold", isCritical ? "text-destructive" : "text-warning")}>
                {item.quantity} left
              </p>
              <p className="text-xs text-muted-foreground">Min: {item.minLevel}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Top Products Widget Component
function TopProductsWidget({ data, isLoading }: { data?: ReturnType<typeof useDashboardStats>["data"]; isLoading: boolean }) {
  if (isLoading) {
    return <Skeleton className="h-[250px] w-full" />
  }

  const chartData = data?.chartData || []

  if (chartData.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
        No sales data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="day" stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
        <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-background)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
          }}
        />
        <Bar dataKey="orders" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Sortable Widget Wrapper
interface SortableWidgetProps {
  widget: DashboardWidgetConfig
  children: React.ReactNode
  onToggle: (id: string, enabled: boolean) => void
}

function SortableWidget({ widget, children, onToggle }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const meta = widgetMeta[widget.type]

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        widget.size === "large" ? "col-span-2" : "col-span-1",
        !widget.enabled && "opacity-50"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            {meta.icon}
            <h3 className="font-semibold text-foreground">{meta.label}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={widget.enabled}
            onCheckedChange={(checked) => onToggle(widget.id, checked)}
          />
          {widget.enabled ? (
            <Eye className="h-4 w-4 text-muted-foreground" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {widget.enabled && <div className="p-4">{children}</div>}
    </Card>
  )
}

// Main Dashboard Widgets Component
export function DashboardWidgets() {
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useDashboardStats()
  const { data: layoutData, isLoading: layoutLoading } = useDashboardLayout()
  const updateLayout = useUpdateDashboardLayout()

  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(defaultDashboardWidgets)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Initialize widgets from saved layout or defaults
  useEffect(() => {
    if (layoutData?.config?.widgets) {
      setWidgets(layoutData.config.widgets)
    } else {
      setWidgets(defaultDashboardWidgets)
    }
  }, [layoutData])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetchDashboard()
      setLastRefresh(new Date())
    }, AUTO_REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [refetchDashboard])

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refetchDashboard()
    setLastRefresh(new Date())
    setIsRefreshing(false)
  }, [refetchDashboard])

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        setWidgets((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id)
          const newIndex = items.findIndex((item) => item.id === over.id)
          const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
            ...item,
            order: index,
          }))

          // Save new layout
          const config: DashboardLayoutConfig = {
            widgets: newItems,
            version: (layoutData?.config?.version || 0) + 1,
            lastUpdated: new Date().toISOString(),
          }
          updateLayout.mutate(config)

          return newItems
        })
      }
    },
    [layoutData?.config?.version, updateLayout]
  )

  // Toggle widget visibility
  const handleToggle = useCallback(
    (id: string, enabled: boolean) => {
      setWidgets((items) => {
        const newItems = items.map((item) =>
          item.id === id ? { ...item, enabled } : item
        )

        // Save new layout
        const config: DashboardLayoutConfig = {
          widgets: newItems,
          version: (layoutData?.config?.version || 0) + 1,
          lastUpdated: new Date().toISOString(),
        }
        updateLayout.mutate(config)

        return newItems
      })
    },
    [layoutData?.config?.version, updateLayout]
  )

  // Render widget content based on type
  const renderWidgetContent = (widget: DashboardWidgetConfig) => {
    switch (widget.type) {
      case "sales_overview":
        return <SalesOverviewWidget data={dashboardData} isLoading={dashboardLoading} />
      case "recent_orders":
        return <RecentOrdersWidget data={dashboardData} isLoading={dashboardLoading} />
      case "low_stock":
        return <LowStockWidget />
      case "top_products":
        return <TopProductsWidget data={dashboardData} isLoading={dashboardLoading} />
      default:
        return null
    }
  }

  if (layoutLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-[200px] w-full" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back to your shop admin panel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Customize
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Dashboard Widgets</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Toggle widgets on/off. Drag and drop to reorder on the main dashboard.
                </p>
                <div className="space-y-2">
                  {widgets.map((widget) => {
                    const meta = widgetMeta[widget.type]
                    return (
                      <div
                        key={widget.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          {meta.icon}
                          <div>
                            <p className="font-medium text-foreground">{meta.label}</p>
                            <p className="text-xs text-muted-foreground">{meta.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={widget.enabled}
                          onCheckedChange={(checked) => handleToggle(widget.id, checked)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Widgets Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgets.map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {widgets
              .sort((a, b) => a.order - b.order)
              .map((widget) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  onToggle={handleToggle}
                >
                  {renderWidgetContent(widget)}
                </SortableWidget>
              ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
