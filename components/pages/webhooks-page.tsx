"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  useWebhooks,
  useWebhookDetail,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useRetryWebhookDelivery,
  type Webhook,
  type WebhookEventType,
  type WebhookDeliveryLog,
  type WebhooksParams,
} from "@/lib/api-hooks"
import { translations, type Language } from "@/lib/i18n"
import {
  Webhook as WebhookIcon,
  Plus,
  Pencil,
  Trash2,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Copy,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Key,
  Settings,
} from "lucide-react"

// Webhook events with labels
const WEBHOOK_EVENTS: { value: WebhookEventType; labelKey: keyof typeof translations.en.webhooks }[] = [
  { value: "ORDER_CREATED", labelKey: "orderCreated" },
  { value: "ORDER_UPDATED", labelKey: "orderUpdated" },
  { value: "PRODUCT_UPDATED", labelKey: "productUpdated" },
  { value: "CUSTOMER_CREATED", labelKey: "customerCreated" },
]

// Status badge colors
const statusColors: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  RETRYING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
}

// Status icons
const statusIcons: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  FAILED: <XCircle className="h-4 w-4 text-red-500" />,
  PENDING: <Clock className="h-4 w-4 text-yellow-500" />,
  RETRYING: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
}

interface WebhooksPageProps {
  language?: Language
}

export function WebhooksPage({ language = "en" }: WebhooksPageProps) {
  const t = translations[language === "en" ? "en" : "kh"].webhooks

  // State
  const [params, setParams] = useState<WebhooksParams>({ page: 1, limit: 10 })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    events: [] as WebhookEventType[],
    description: "",
  })

  // Query hooks
  const { data, isLoading, error } = useWebhooks(params)
  const { data: detailData, isLoading: detailLoading } = useWebhookDetail(selectedWebhookId)

  // Mutation hooks
  const createMutation = useCreateWebhook()
  const updateMutation = useUpdateWebhook()
  const deleteMutation = useDeleteWebhook()
  const testMutation = useTestWebhook()
  const retryMutation = useRetryWebhookDelivery()

  // Handlers
  const handleCreate = () => {
    setFormData({ name: "", url: "", events: [], description: "" })
    setCreateDialogOpen(true)
  }

  const handleEdit = (webhook: Webhook) => {
    setSelectedWebhook(webhook)
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      description: webhook.description || "",
    })
    setEditDialogOpen(true)
  }

  const handleViewDetails = (webhook: Webhook) => {
    setSelectedWebhookId(webhook.id)
    setDetailDialogOpen(true)
  }

  const handleDelete = (webhook: Webhook) => {
    setSelectedWebhook(webhook)
    setDeleteDialogOpen(true)
  }

  const handleTest = async (webhookId: string) => {
    await testMutation.mutateAsync(webhookId)
  }

  const handleRetry = async (logId: string) => {
    await retryMutation.mutateAsync(logId)
  }

  const handleToggleActive = async (webhook: Webhook) => {
    await updateMutation.mutateAsync({
      id: webhook.id,
      isActive: !webhook.isActive,
    })
  }

  const handleSubmitCreate = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) return

    await createMutation.mutateAsync({
      name: formData.name,
      url: formData.url,
      events: formData.events,
      description: formData.description || undefined,
    })
    setCreateDialogOpen(false)
  }

  const handleSubmitEdit = async () => {
    if (!selectedWebhook || !formData.name || !formData.url || formData.events.length === 0) return

    await updateMutation.mutateAsync({
      id: selectedWebhook.id,
      name: formData.name,
      url: formData.url,
      events: formData.events,
      description: formData.description || undefined,
    })
    setEditDialogOpen(false)
  }

  const handleConfirmDelete = async () => {
    if (!selectedWebhook) return
    await deleteMutation.mutateAsync(selectedWebhook.id)
    setDeleteDialogOpen(false)
    setSelectedWebhook(null)
  }

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret)
  }

  const handleEventToggle = (event: WebhookEventType) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }))
  }

  // Pagination
  const handlePageChange = (newPage: number) => {
    setParams((prev) => ({ ...prev, page: newPage }))
  }

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleString(language === "en" ? "en-US" : "km-KH")
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Failed to load webhooks</h3>
        <p className="text-muted-foreground">Please try again later</p>
      </div>
    )
  }

  const webhooks = data?.webhooks || []
  const pagination = data?.pagination

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <WebhookIcon className="h-6 w-6" />
            {t.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t.description}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t.createWebhook}
        </Button>
      </div>

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <Card className="p-12 text-center">
          <WebhookIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t.noWebhooks}</h3>
          <p className="text-muted-foreground mb-4">{t.description}</p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t.createWebhook}
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium truncate">{webhook.name}</h3>
                    <Badge variant={webhook.isActive ? "default" : "secondary"}>
                      {webhook.isActive ? t.active : t.inactive}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {webhook.url}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {webhook.events.map((event) => {
                      const eventConfig = WEBHOOK_EVENTS.find((e) => e.value === event)
                      return (
                        <Badge key={event} variant="outline" className="text-xs">
                          {eventConfig ? t[eventConfig.labelKey] : event}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm mx-4">
                  <div className="text-center">
                    <div className="font-medium">{webhook.successCount}</div>
                    <div className="text-xs text-muted-foreground">{t.successCount}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{webhook.failureCount}</div>
                    <div className="text-xs text-muted-foreground">{t.failureCount}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-xs">
                      {formatDate(webhook.lastTriggeredAt)}
                    </div>
                    <div className="text-xs text-muted-foreground">{t.lastTriggered}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={webhook.isActive}
                    onCheckedChange={() => handleToggleActive(webhook)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(webhook.id)}
                    disabled={!webhook.isActive || testMutation.isPending}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(webhook)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(webhook)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(webhook)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
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
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.createWebhook}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.name}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="My Webhook"
              />
            </div>
            <div>
              <Label>{t.url}</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div>
              <Label>{t.events}</Label>
              <div className="space-y-2 mt-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <div key={event.value} className="flex items-center gap-2">
                    <Checkbox
                      id={event.value}
                      checked={formData.events.includes(event.value)}
                      onCheckedChange={() => handleEventToggle(event.value)}
                    />
                    <Label htmlFor={event.value} className="cursor-pointer">
                      {t[event.labelKey]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What is this webhook for?"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCreate}
              disabled={!formData.name || !formData.url || formData.events.length === 0 || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : t.createWebhook}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.editWebhook}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.name}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t.url}</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t.events}</Label>
              <div className="space-y-2 mt-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <div key={event.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-${event.value}`}
                      checked={formData.events.includes(event.value)}
                      onCheckedChange={() => handleEventToggle(event.value)}
                    />
                    <Label htmlFor={`edit-${event.value}`} className="cursor-pointer">
                      {t[event.labelKey]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={!formData.name || !formData.url || formData.events.length === 0 || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {detailData?.webhook.name || "Webhook Details"}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : detailData ? (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold">{detailData.stats.totalDeliveries}</div>
                  <div className="text-xs text-muted-foreground">{t.totalDeliveries}</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{detailData.stats.successCount}</div>
                  <div className="text-xs text-muted-foreground">{t.successCount}</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{detailData.stats.failureCount}</div>
                  <div className="text-xs text-muted-foreground">{t.failureCount}</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold">{detailData.stats.successRate}%</div>
                  <div className="text-xs text-muted-foreground">{t.successRate}</div>
                </Card>
              </div>

              {/* Secret */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Key className="h-4 w-4" />
                <code className="flex-1 text-sm">{detailData.webhook.secret}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopySecret(detailData.webhook.secret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {/* Delivery Logs */}
              <div>
                <h4 className="font-medium mb-2">{t.deliveryLogs}</h4>
                <ScrollArea className="h-[300px]">
                  {detailData.deliveryLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t.noLogs}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detailData.deliveryLogs.map((log: WebhookDeliveryLog) => (
                        <Card key={log.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {statusIcons[log.status]}
                              <Badge className={statusColors[log.status]} variant="secondary">
                                {t[log.status.toLowerCase() as keyof typeof t] || log.status}
                              </Badge>
                              <Badge variant="outline">{log.event}</Badge>
                              {log.httpStatus && (
                                <span className="text-sm text-muted-foreground">
                                  HTTP {log.httpStatus}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(log.createdAt)}
                              </span>
                              {log.status === "FAILED" && log.attempt < log.maxAttempts && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRetry(log.id)}
                                  disabled={retryMutation.isPending}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {log.errorMessage && (
                            <p className="text-sm text-red-500 mt-2">{log.errorMessage}</p>
                          )}
                          {log.durationMs && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Duration: {log.durationMs}ms
                            </p>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteWebhook}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmDelete}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
