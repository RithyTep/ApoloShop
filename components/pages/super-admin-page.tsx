"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Building2,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCog,
} from "lucide-react"
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useClientStats,
  setClientImpersonation,
  Client,
} from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"

interface ClientFormData {
  name: string
  slug: string
  domain: string
  currency: "USD" | "KHR"
  language: "EN" | "KH"
  isActive: boolean
}

const defaultFormData: ClientFormData = {
  name: "",
  slug: "",
  domain: "",
  currency: "USD",
  language: "EN",
  isActive: true,
}

export function SuperAdminPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  // Dialogs state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [viewClient, setViewClient] = useState<Client | null>(null)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState<ClientFormData>(defaultFormData)

  // Fetch clients
  const { data, isLoading, refetch } = useClients({
    page,
    limit: 10,
    search: search || undefined,
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
  })

  // Mutations
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const deleteMutation = useDeleteClient()

  // Fetch client stats for view dialog
  const { data: clientStatsData, isLoading: isLoadingStats } = useClientStats(viewClient?.id || "")

  const clients = data?.clients || []
  const pagination = data?.pagination

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        slug: formData.slug,
        domain: formData.domain || undefined,
        settings: {
          currency: formData.currency,
          language: formData.language,
        },
        isActive: formData.isActive,
      })
      toast({ title: "Client created successfully" })
      setCreateDialogOpen(false)
      setFormData(defaultFormData)
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleUpdate = async () => {
    if (!editClient) return
    try {
      await updateMutation.mutateAsync({
        id: editClient.id,
        name: formData.name,
        slug: formData.slug,
        domain: formData.domain || null,
        settings: {
          currency: formData.currency,
          language: formData.language,
        },
        isActive: formData.isActive,
      })
      toast({ title: "Client updated successfully" })
      setEditClient(null)
      setFormData(defaultFormData)
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteClient) return
    try {
      const result = await deleteMutation.mutateAsync({ id: deleteClient.id })
      if (result.softDeleted) {
        toast({
          title: "Client deactivated",
          description: `Client has ${result.counts?.products || 0} products, ${result.counts?.orders || 0} orders, and ${result.counts?.customers || 0} customers. Client was deactivated instead of deleted.`,
        })
      } else {
        toast({ title: "Client deleted successfully" })
      }
      setDeleteClient(null)
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (client: Client) => {
    setEditClient(client)
    setFormData({
      name: client.name,
      slug: client.slug,
      domain: client.domain || "",
      currency: client.settings?.currency || "USD",
      language: client.settings?.language || "EN",
      isActive: client.isActive,
    })
  }

  const handleImpersonate = (client: Client) => {
    setClientImpersonation(client.id, client.slug)
    toast({
      title: "Impersonating client",
      description: `You are now viewing as ${client.name}. Refresh to see changes.`,
    })
    // Open admin dashboard in new tab with client context
    window.open(`/admin?client=${client.slug}`, "_blank")
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Super Admin</h1>
          <p className="text-muted-foreground mt-2">Manage all clients and tenants</p>
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Super Admin</h1>
          <p className="text-muted-foreground mt-2">Manage all clients and tenants</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Client
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <p className="text-2xl font-bold">{pagination?.total || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Clients</p>
              <p className="text-2xl font-bold">{clients.filter((c) => c.isActive).length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold">
                {clients.reduce((sum, c) => sum + (c._count?.products || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <ShoppingBag className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">
                {clients.reduce((sum, c) => sum + (c._count?.orders || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value: "all" | "active" | "inactive") => {
              setStatusFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            {pagination?.total || 0} clients found
          </div>
        </div>
      </Card>

      {/* Clients Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          {clients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-foreground font-semibold">Client</TableHead>
                  <TableHead className="text-foreground font-semibold">Slug/Domain</TableHead>
                  <TableHead className="text-foreground font-semibold">Products</TableHead>
                  <TableHead className="text-foreground font-semibold">Orders</TableHead>
                  <TableHead className="text-foreground font-semibold">Customers</TableHead>
                  <TableHead className="text-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-foreground font-semibold">Created</TableHead>
                  <TableHead className="text-foreground font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} className="border-b border-border hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {client.logoUrl ? (
                          <img
                            src={client.logoUrl}
                            alt={client.name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-mono">{client.slug}</div>
                        {client.domain && (
                          <div className="text-xs text-muted-foreground">{client.domain}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{client._count?.products || 0}</TableCell>
                    <TableCell>{client._count?.orders || 0}</TableCell>
                    <TableCell>{client._count?.customers || 0}</TableCell>
                    <TableCell>
                      <Badge variant={client.isActive ? "default" : "secondary"}>
                        {client.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(client.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewClient(client)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(client)}
                          title="Edit client"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleImpersonate(client)}
                          title="Impersonate client admin"
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteClient(client)}
                          className="text-destructive hover:text-destructive"
                          title="Delete client"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No clients found
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Client Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Add a new client/tenant to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Coffee Shop"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (subdomain)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  })
                }
                placeholder="my-coffee-shop"
              />
              <p className="text-xs text-muted-foreground">
                Will be accessible at {formData.slug || "slug"}.apoloshop.com
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Custom Domain (optional)</Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="https://shop.mycoffee.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value: "USD" | "KHR") =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="KHR">KHR (៛)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value: "EN" | "KH") =>
                    setFormData({ ...formData, language: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EN">English</SelectItem>
                    <SelectItem value="KH">Khmer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name || !formData.slug || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!editClient} onOpenChange={() => setEditClient(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Client Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug (subdomain)</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-domain">Custom Domain (optional)</Label>
              <Input
                id="edit-domain"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value: "USD" | "KHR") =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="KHR">KHR (៛)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value: "EN" | "KH") =>
                    setFormData({ ...formData, language: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EN">English</SelectItem>
                    <SelectItem value="KH">Khmer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClient(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name || !formData.slug || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Client Details Dialog */}
      <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewClient?.logoUrl ? (
                <img
                  src={viewClient.logoUrl}
                  alt={viewClient.name}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <Building2 className="h-6 w-6" />
              )}
              {viewClient?.name}
            </DialogTitle>
            <DialogDescription>Client details and statistics</DialogDescription>
          </DialogHeader>
          {viewClient && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Slug:</span>
                  <span className="ml-2 font-mono">{viewClient.slug}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className="ml-2" variant={viewClient.isActive ? "default" : "secondary"}>
                    {viewClient.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {viewClient.domain && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Domain:</span>
                    <a
                      href={viewClient.domain}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {viewClient.domain}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Currency:</span>
                  <span className="ml-2">{viewClient.settings?.currency || "USD"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Language:</span>
                  <span className="ml-2">{viewClient.settings?.language || "EN"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <span className="ml-2">{formatDate(viewClient.createdAt)}</span>
                </div>
              </div>

              {/* Statistics */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">Statistics</h4>
                {isLoadingStats ? (
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm">Revenue</span>
                      </div>
                      <p className="text-xl font-bold">
                        {formatCurrency(clientStatsData?.stats.totalRevenue || 0)}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <ShoppingBag className="h-4 w-4" />
                        <span className="text-sm">Orders</span>
                      </div>
                      <p className="text-xl font-bold">
                        {clientStatsData?.stats.orderCount || viewClient._count?.orders || 0}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm">Avg Order</span>
                      </div>
                      <p className="text-xl font-bold">
                        {formatCurrency(clientStatsData?.stats.averageOrderValue || 0)}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Package className="h-4 w-4" />
                        <span className="text-sm">Products</span>
                      </div>
                      <p className="text-xl font-bold">
                        {clientStatsData?.stats.productCount || viewClient._count?.products || 0}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">Customers</span>
                      </div>
                      <p className="text-xl font-bold">
                        {clientStatsData?.stats.customerCount || viewClient._count?.customers || 0}
                      </p>
                    </Card>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t pt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleImpersonate(viewClient)}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Impersonate Admin
                </Button>
                <Button onClick={() => setViewClient(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteClient?.name}&quot;?
              {deleteClient?._count &&
                (deleteClient._count.products > 0 ||
                  deleteClient._count.orders > 0 ||
                  deleteClient._count.customers > 0) && (
                  <span className="block mt-2 text-orange-500">
                    This client has {deleteClient._count.products} products,{" "}
                    {deleteClient._count.orders} orders, and {deleteClient._count.customers}{" "}
                    customers. It will be deactivated instead of permanently deleted.
                  </span>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
