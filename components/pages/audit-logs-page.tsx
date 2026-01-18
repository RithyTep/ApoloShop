"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useAuditLogs,
  type AuditLog,
  type AuditAction,
  type AuditLogsParams,
} from "@/lib/api-hooks"
import {
  Search,
  X,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Settings,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  BarChart3,
  Clock,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import {
  AdminPageHeader,
  AdminFilterCardGrid,
  AdminDataCard,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"

// Action icons mapping
const actionIcons: Record<AuditAction, React.ReactNode> = {
  CREATE: <Plus className="h-4 w-4 text-green-500" />,
  UPDATE: <Pencil className="h-4 w-4 text-blue-500" />,
  DELETE: <Trash2 className="h-4 w-4 text-red-500" />,
  LOGIN: <LogIn className="h-4 w-4 text-purple-500" />,
  LOGOUT: <LogOut className="h-4 w-4 text-gray-500" />,
  SETTINGS_CHANGE: <Settings className="h-4 w-4 text-orange-500" />,
}

// Action colors for charts
const actionColors: Record<AuditAction, string> = {
  CREATE: "#22c55e",
  UPDATE: "#3b82f6",
  DELETE: "#ef4444",
  LOGIN: "#a855f7",
  LOGOUT: "#6b7280",
  SETTINGS_CHANGE: "#f97316",
}

// Resource colors for charts
const resourceColors: Record<string, string> = {
  product: "#3b82f6",
  order: "#22c55e",
  settings: "#f97316",
  user: "#a855f7",
  category: "#ec4899",
  promotion: "#eab308",
  inventory: "#06b6d4",
  customer: "#14b8a6",
  client: "#8b5cf6",
}

export function AuditLogsPage() {
  // Filter state
  const [filters, setFilters] = useState<AuditLogsParams>({
    page: 1,
    limit: 20,
  })
  const [searchInput, setSearchInput] = useState("")
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Fetch audit logs
  const { data, isLoading, error } = useAuditLogs(filters)

  // Handle search with debounce
  const handleSearch = () => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      search: searchInput.trim() || undefined,
    }))
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({ page: 1, limit: 20 })
    setSearchInput("")
  }

  // Pagination
  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }

  // Prepare chart data
  const actionChartData = useMemo(() => {
    if (!data?.summary?.byAction) return []
    return Object.entries(data.summary.byAction)
      .filter(([, count]) => count > 0)
      .map(([action, count]) => ({
        action,
        count,
        fill: actionColors[action as AuditAction] || "#6b7280",
      }))
  }, [data?.summary?.byAction])

  const resourceChartData = useMemo(() => {
    if (!data?.summary?.byResource) return []
    return Object.entries(data.summary.byResource)
      .filter(([, count]) => count > 0)
      .map(([resource, count]) => ({
        resource,
        count,
        fill: resourceColors[resource] || "#6b7280",
      }))
  }, [data?.summary?.byResource])

  const hourlyActivityData = useMemo(() => {
    if (!data?.summary?.hourlyActivity) return []
    return data.summary.hourlyActivity.map((item) => ({
      hour: `${item.hour.toString().padStart(2, "0")}:00`,
      count: item.count,
    }))
  }, [data?.summary?.hourlyActivity])

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // Format action label
  const formatAction = (action: AuditAction) => {
    const labels: Record<AuditAction, string> = {
      CREATE: "Create",
      UPDATE: "Update",
      DELETE: "Delete",
      LOGIN: "Login",
      LOGOUT: "Logout",
      SETTINGS_CHANGE: "Settings Change",
    }
    return labels[action] || action
  }

  // Loading state
  if (isLoading) {
    return (
      <AdminLoading
        title="Audit Logs"
        subtitle="Track all admin actions for security and compliance"
        rows={5}
      />
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Failed to load audit logs
          </h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </Card>
      </div>
    )
  }

  const { logs, pagination, summary } = data || {
    logs: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    summary: { total: 0, byAction: {}, byResource: {}, hourlyActivity: [] },
  }

  const hasFilters = filters.action || filters.resource || filters.startDate || filters.endDate || filters.search

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Audit Logs"
        subtitle="Track all admin actions for security and compliance"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* By Action Chart */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">By Action</h3>
          </div>
          {actionChartData.length > 0 ? (
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={actionChartData}
                    dataKey="count"
                    nameKey="action"
                    cx="50%"
                    cy="50%"
                    outerRadius={50}
                    innerRadius={25}
                  >
                    {actionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No data
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {actionChartData.map((item) => (
              <AdminBadge
                key={item.action}
                variant="outline"
              >
                {formatAction(item.action as AuditAction)}: {item.count}
              </AdminBadge>
            ))}
          </div>
        </Card>

        {/* By Resource Chart */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">By Resource</h3>
          </div>
          {resourceChartData.length > 0 ? (
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resourceChartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="resource"
                    width={60}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" radius={4}>
                    {resourceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No data
            </p>
          )}
        </Card>

        {/* Hourly Activity Chart */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Recent Activity (24h)</h3>
          </div>
          {hourlyActivityData.some((h) => h.count > 0) ? (
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyActivityData}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10 }}
                    interval={3}
                  />
                  <YAxis hide />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    fill="#3b82f680"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No activity in the last 24 hours
            </p>
          )}
        </Card>
      </div>

      {/* Filters */}
      <AdminFilterCardGrid columns={4}>
        {/* Search */}
        <div className="md:col-span-2">
          <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Search by user name or resource ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} size="icon" variant="secondary">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Filter */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Action</Label>
          <Select
            value={filters.action || "all"}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                action: value === "all" ? undefined : (value as AuditAction),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {data?.filters?.validActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {formatAction(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Resource Filter */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Resource</Label>
          <Select
            value={filters.resource || "all"}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                resource: value === "all" ? undefined : value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Resources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              {data?.filters?.validResources.map((resource) => (
                <SelectItem key={resource} value={resource}>
                  {resource.charAt(0).toUpperCase() + resource.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Date Range</Label>
          <div className="flex gap-1">
            <Input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  page: 1,
                  startDate: e.target.value || undefined,
                }))
              }
              className="flex-1 text-xs"
            />
            <Input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  page: 1,
                  endDate: e.target.value || undefined,
                }))
              }
              className="flex-1 text-xs"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </AdminFilterCardGrid>

      {/* Logs Table */}
      <AdminDataCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">
            Audit Logs ({pagination.total.toLocaleString()})
          </h3>
        </div>

        {logs.length === 0 ? (
          <AdminEmptyState message="No audit logs found" />
        ) : (
          <>
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  {/* Action Icon */}
                  <div className="flex-shrink-0">
                    {actionIcons[log.action]}
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {formatAction(log.action)}
                      </span>
                      <AdminBadge variant="secondary">
                        {log.resource}
                      </AdminBadge>
                      {log.resourceId && (
                        <span className="text-xs text-muted-foreground truncate">
                          {log.resourceId}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {log.userName || "System"} •{" "}
                      {formatTimestamp(log.createdAt)}
                    </div>
                  </div>

                  {/* View Button */}
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </AdminDataCard>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && actionIcons[selectedLog.action]}
              {selectedLog && formatAction(selectedLog.action)} Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Action</Label>
                  <p className="font-medium">{formatAction(selectedLog.action)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Resource</Label>
                  <p className="font-medium capitalize">{selectedLog.resource}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">User</Label>
                  <p className="font-medium">{selectedLog.userName || "System"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Resource ID</Label>
                  <p className="font-medium font-mono text-sm">
                    {selectedLog.resourceId || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Timestamp</Label>
                  <p className="font-medium">{formatTimestamp(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">IP Address</Label>
                  <p className="font-medium font-mono text-sm">
                    {selectedLog.ipAddress || "N/A"}
                  </p>
                </div>
              </div>

              {selectedLog.userAgent && (
                <div>
                  <Label className="text-xs text-muted-foreground">User Agent</Label>
                  <p className="text-sm text-muted-foreground break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Details</Label>
                  <ScrollArea className="h-48 mt-1">
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
