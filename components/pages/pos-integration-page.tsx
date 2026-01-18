"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import {
  Plus,
  Pencil,
  Trash,
  RefreshCw,
  Check,
  X,
  Clock,
  Copy,
  Package,
  Users,
  DollarSign,
  Activity,
} from "lucide-react"
import { translations, type Language } from "@/lib/i18n"
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

interface POSProvider {
  id: string
  name: string
  type: "SQUARE" | "LOYVERSE"
  locationId?: string
  merchantId?: string
  syncInventory: boolean
  syncSales: boolean
  syncCustomers: boolean
  syncInterval: number
  lastSyncAt?: string
  isActive: boolean
  connectionStatus: string
  lastError?: string
  webhookUrl?: string
  hasAccessToken: boolean
  _count: {
    syncs: number
    sales: number
    productMappings: number
    customerMappings: number
  }
}

interface POSSync {
  id: string
  direction: string
  status: string
  syncType: string
  totalItems: number
  processedItems: number
  failedItems: number
  startedAt?: string
  completedAt?: string
  summary?: { created: number; updated: number; failed: number }
  errorDetails?: string
  triggeredBy: string
  createdAt: string
  provider: { id: string; name: string; type: string }
}

interface FormData {
  name: string
  type: "SQUARE" | "LOYVERSE"
  accessToken: string
  refreshToken: string
  locationId: string
  syncInventory: boolean
  syncSales: boolean
  syncCustomers: boolean
  syncInterval: number
}

const emptyFormData: FormData = {
  name: "",
  type: "SQUARE",
  accessToken: "",
  refreshToken: "",
  locationId: "",
  syncInventory: true,
  syncSales: true,
  syncCustomers: true,
  syncInterval: 15,
}

interface POSIntegrationPageProps {
  language?: Language
}

export function POSIntegrationPage({ language = "en" }: POSIntegrationPageProps) {
  const { toast } = useToast()
  const t = translations[language].pos

  // State
  const [providers, setProviders] = useState<POSProvider[]>([])
  const [syncs, setSyncs] = useState<POSSync[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<POSProvider | null>(null)
  const [deleteProvider, setDeleteProvider] = useState<POSProvider | null>(null)
  const [formData, setFormData] = useState<FormData>(emptyFormData)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<POSProvider | null>(null)
  const [isSyncing, setIsSyncing] = useState<string | null>(null)
  const [copiedWebhook, setCopiedWebhook] = useState(false)

  // Fetch providers
  useEffect(() => {
    fetchProviders()
  }, [])

  // Fetch syncs when provider is selected
  useEffect(() => {
    if (selectedProvider) {
      fetchSyncs(selectedProvider.id)
    }
  }, [selectedProvider])

  async function fetchProviders() {
    setIsLoading(true)
    try {
      const response = await fetch("/api/pos")
      const data = await response.json()
      setProviders(data.providers || [])
      if (data.providers?.length > 0 && !selectedProvider) {
        setSelectedProvider(data.providers[0])
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch POS providers", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchSyncs(providerId: string) {
    try {
      const response = await fetch(`/api/pos/sync?providerId=${providerId}&limit=20`)
      const data = await response.json()
      setSyncs(data.syncs || [])
    } catch {
      console.error("Failed to fetch syncs")
    }
  }

  const resetForm = () => {
    setFormData(emptyFormData)
    setEditingProvider(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (provider: POSProvider) => {
    setEditingProvider(provider)
    setFormData({
      name: provider.name,
      type: provider.type,
      accessToken: "",
      refreshToken: "",
      locationId: provider.locationId || "",
      syncInventory: provider.syncInventory,
      syncSales: provider.syncSales,
      syncCustomers: provider.syncCustomers,
      syncInterval: provider.syncInterval,
    })
    setIsDialogOpen(true)
  }

  const handleTestConnection = async () => {
    if (!formData.accessToken && !editingProvider) {
      toast({ title: "Error", description: "Access token is required", variant: "destructive" })
      return
    }

    setIsTesting(true)
    try {
      const response = await fetch("/api/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name || "Test Connection",
          type: formData.type,
          accessToken: formData.accessToken,
          locationId: formData.locationId || undefined,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast({ title: t.connectionSuccess, description: `Merchant ID: ${data.provider?.merchantId || "N/A"}` })
        // Clean up test provider if it was created
        if (data.provider?.id && !editingProvider) {
          await fetch(`/api/pos?id=${data.provider.id}`, { method: "DELETE" })
        }
      } else {
        toast({ title: t.connectionFailed, description: data.details || data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: t.connectionFailed, description: "Network error", variant: "destructive" })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name || (!formData.accessToken && !editingProvider)) {
      toast({ title: "Error", description: "Name and access token are required", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const method = editingProvider ? "PUT" : "POST"
      const body = editingProvider
        ? { id: editingProvider.id, ...formData, accessToken: formData.accessToken || undefined }
        : formData

      const response = await fetch("/api/pos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (response.ok) {
        toast({ title: "Success", description: editingProvider ? "Provider updated" : "Provider connected" })
        setIsDialogOpen(false)
        resetForm()
        fetchProviders()
      } else {
        toast({ title: "Error", description: data.details || data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to save provider", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteProvider) return

    try {
      const response = await fetch(`/api/pos?id=${deleteProvider.id}`, { method: "DELETE" })
      if (response.ok) {
        toast({ title: "Success", description: "Provider disconnected" })
        if (selectedProvider?.id === deleteProvider.id) {
          setSelectedProvider(null)
        }
        fetchProviders()
      } else {
        toast({ title: "Error", description: "Failed to disconnect", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to disconnect", variant: "destructive" })
    } finally {
      setDeleteProvider(null)
    }
  }

  const handleSync = async (syncType: "inventory" | "sales" | "customers" | "full") => {
    if (!selectedProvider) return

    setIsSyncing(syncType)
    try {
      const response = await fetch("/api/pos/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: selectedProvider.id,
          syncType,
          direction: "INBOUND",
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast({ title: "Sync Started", description: `Sync ID: ${data.syncId}` })
        // Refresh syncs after a delay
        setTimeout(() => fetchSyncs(selectedProvider.id), 2000)
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to start sync", variant: "destructive" })
    } finally {
      setIsSyncing(null)
    }
  }

  const copyWebhookUrl = () => {
    if (selectedProvider?.webhookUrl) {
      navigator.clipboard.writeText(selectedProvider.webhookUrl)
      setCopiedWebhook(true)
      setTimeout(() => setCopiedWebhook(false), 2000)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <AdminBadge variant="default">{t.connected}</AdminBadge>
      case "disconnected":
        return <AdminBadge variant="secondary">{t.disconnected}</AdminBadge>
      case "error":
        return <AdminBadge variant="destructive">{t.error}</AdminBadge>
      default:
        return <AdminBadge variant="outline">{status}</AdminBadge>
    }
  }

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <AdminBadge variant="default"><Check className="w-3 h-3 mr-1" />{t.completed}</AdminBadge>
      case "FAILED":
        return <AdminBadge variant="destructive"><X className="w-3 h-3 mr-1" />{t.failed}</AdminBadge>
      case "IN_PROGRESS":
        return <AdminBadge variant="outline"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />{t.inProgress}</AdminBadge>
      case "PENDING":
        return <AdminBadge variant="secondary"><Clock className="w-3 h-3 mr-1" />{t.pending}</AdminBadge>
      default:
        return <AdminBadge variant="outline">{status}</AdminBadge>
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return t.never
    return new Date(dateStr).toLocaleString()
  }

  if (isLoading) {
    return (
      <AdminLoading
        title={t.title}
        subtitle={t.subtitle}
        rows={3}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title={t.title}
        subtitle={t.subtitle}
      >
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          {t.addProvider}
        </Button>
      </AdminPageHeader>

      {/* Provider Cards */}
      {providers.length === 0 ? (
        <AdminDataCard>
          <AdminEmptyState message={t.noProviders} />
          <div className="text-center pb-6">
            <p className="text-muted-foreground text-sm mb-4">
              Connect Square or Loyverse to sync your inventory and sales
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {t.addProvider}
            </Button>
          </div>
        </AdminDataCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <Card
              key={provider.id}
              className={`cursor-pointer transition-all ${
                selectedProvider?.id === provider.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedProvider(provider)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    provider.type === "SQUARE" ? "bg-black text-white" : "bg-blue-500 text-white"
                  }`}>
                    {provider.type === "SQUARE" ? "SQ" : "LV"}
                  </div>
                  <div>
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{provider.type}</p>
                  </div>
                </div>
                {getStatusBadge(provider.connectionStatus)}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center text-sm mb-3">
                  <div>
                    <p className="font-semibold">{provider._count.productMappings}</p>
                    <p className="text-xs text-muted-foreground">Products</p>
                  </div>
                  <div>
                    <p className="font-semibold">{provider._count.sales}</p>
                    <p className="text-xs text-muted-foreground">Sales</p>
                  </div>
                  <div>
                    <p className="font-semibold">{provider._count.syncs}</p>
                    <p className="text-xs text-muted-foreground">Syncs</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t.lastSync}: {formatDate(provider.lastSyncAt)}</span>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); openEditDialog(provider) }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteProvider(provider) }}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Provider Details */}
      {selectedProvider && (
        <Tabs defaultValue="sync" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sync">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="w-4 h-4 mr-2" />
              {t.syncHistory}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Activity className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Sync Tab */}
          <TabsContent value="sync">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.syncNow}</CardTitle>
                  <CardDescription>Manually trigger sync operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    disabled={!!isSyncing || !selectedProvider.syncInventory}
                    onClick={() => handleSync("inventory")}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    {isSyncing === "inventory" ? t.syncing : t.inventorySync}
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    disabled={!!isSyncing || !selectedProvider.syncSales}
                    onClick={() => handleSync("sales")}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    {isSyncing === "sales" ? t.syncing : t.salesImport}
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    disabled={!!isSyncing || !selectedProvider.syncCustomers}
                    onClick={() => handleSync("customers")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {isSyncing === "customers" ? t.syncing : t.customerSync}
                  </Button>
                  <Button
                    className="w-full"
                    disabled={!!isSyncing}
                    onClick={() => handleSync("full")}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing === "full" ? "animate-spin" : ""}`} />
                    {isSyncing === "full" ? t.syncing : t.full}
                  </Button>
                </CardContent>
              </Card>

              {/* Webhook URL */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.webhookUrl}</CardTitle>
                  <CardDescription>{t.webhookUrlDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedProvider.webhookUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={selectedProvider.webhookUrl}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button size="icon" variant="outline" onClick={copyWebhookUrl}>
                          {copiedWebhook ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Events: inventory.level_changed, order.created, customer.created
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Webhook URL not available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <AdminDataCard>
              <h3 className="font-semibold mb-4">{t.syncHistory}</h3>
              <ScrollArea className="h-[400px]">
                {syncs.length === 0 ? (
                  <AdminEmptyState message="No sync history" />
                ) : (
                  <AdminTable>
                    <AdminTableHeader>
                      <AdminTableHeadRow>
                        <AdminTableHead>{t.syncType}</AdminTableHead>
                        <AdminTableHead>{t.syncStatus}</AdminTableHead>
                        <AdminTableHead>{t.processed}</AdminTableHead>
                        <AdminTableHead>{t.startTime}</AdminTableHead>
                        <AdminTableHead>Triggered By</AdminTableHead>
                      </AdminTableHeadRow>
                    </AdminTableHeader>
                    <AdminTableBody>
                      {syncs.map((sync) => (
                        <AdminTableRow key={sync.id}>
                          <AdminTableCell>
                            <AdminBadge variant="outline">{sync.syncType}</AdminBadge>
                          </AdminTableCell>
                          <AdminTableCell>{getSyncStatusBadge(sync.status)}</AdminTableCell>
                          <AdminTableCell>
                            {sync.processedItems}/{sync.totalItems}
                            {sync.failedItems > 0 && (
                              <span className="text-destructive ml-1">({sync.failedItems} failed)</span>
                            )}
                          </AdminTableCell>
                          <AdminTableCell>{formatDate(sync.startedAt || sync.createdAt)}</AdminTableCell>
                          <AdminTableCell>{sync.triggeredBy}</AdminTableCell>
                        </AdminTableRow>
                      ))}
                    </AdminTableBody>
                  </AdminTable>
                )}
              </ScrollArea>
            </AdminDataCard>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <AdminDataCard>
              <h3 className="font-semibold mb-4">{t.syncSettings}</h3>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t.syncInventory}</Label>
                      <p className="text-xs text-muted-foreground">{t.syncInventoryDesc}</p>
                    </div>
                    <Switch checked={selectedProvider.syncInventory} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t.syncSales}</Label>
                      <p className="text-xs text-muted-foreground">{t.syncSalesDesc}</p>
                    </div>
                    <Switch checked={selectedProvider.syncSales} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t.syncCustomers}</Label>
                      <p className="text-xs text-muted-foreground">{t.syncCustomersDesc}</p>
                    </div>
                    <Switch checked={selectedProvider.syncCustomers} disabled />
                  </div>
                  <div>
                    <Label>{t.syncInterval}</Label>
                    <p className="text-sm">{selectedProvider.syncInterval} {t.minutes}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => openEditDialog(selectedProvider)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  {t.editProvider}
                </Button>
              </div>
            </AdminDataCard>
          </TabsContent>
        </Tabs>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProvider ? t.editProvider : t.addProvider}</DialogTitle>
            <DialogDescription>
              {editingProvider
                ? "Update your POS provider settings"
                : "Connect a new Point of Sale system"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div>
                <Label>{t.providerName}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Main Store POS"
                />
              </div>
              <div>
                <Label>{t.providerType}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "SQUARE" | "LOYVERSE") =>
                    setFormData({ ...formData, type: value })
                  }
                  disabled={!!editingProvider}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SQUARE">{t.square}</SelectItem>
                    <SelectItem value="LOYVERSE">{t.loyverse}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.accessToken}</Label>
                <Input
                  type="password"
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  placeholder={editingProvider ? "Leave blank to keep current" : t.accessTokenPlaceholder}
                />
              </div>
              <div>
                <Label>{t.locationId}</Label>
                <Input
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  placeholder={t.locationIdPlaceholder}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>{t.syncSettings}</Label>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm">{t.syncInventory}</span>
                  <p className="text-xs text-muted-foreground">{t.syncInventoryDesc}</p>
                </div>
                <Switch
                  checked={formData.syncInventory}
                  onCheckedChange={(checked) => setFormData({ ...formData, syncInventory: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm">{t.syncSales}</span>
                  <p className="text-xs text-muted-foreground">{t.syncSalesDesc}</p>
                </div>
                <Switch
                  checked={formData.syncSales}
                  onCheckedChange={(checked) => setFormData({ ...formData, syncSales: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm">{t.syncCustomers}</span>
                  <p className="text-xs text-muted-foreground">{t.syncCustomersDesc}</p>
                </div>
                <Switch
                  checked={formData.syncCustomers}
                  onCheckedChange={(checked) => setFormData({ ...formData, syncCustomers: checked })}
                />
              </div>
              <div>
                <Label>{t.syncInterval} ({t.minutes})</Label>
                <Select
                  value={formData.syncInterval.toString()}
                  onValueChange={(value) => setFormData({ ...formData, syncInterval: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="120">120</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
              {isTesting ? t.testing : t.testConnection}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : editingProvider ? t.save : t.connect}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProvider} onOpenChange={() => setDeleteProvider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.disconnect} {deleteProvider?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all sync history and mappings for this provider. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t.disconnect}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
