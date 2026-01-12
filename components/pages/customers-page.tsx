"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Eye, Pencil, Bell } from "lucide-react"
import { useCustomers, useUpdateCustomer, Customer } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import { NotificationPreferences } from "@/components/notification-preferences"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function CustomersPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)

  const { data, isLoading } = useCustomers()
  const updateMutation = useUpdateCustomer()

  const allCustomers = data?.customers || []

  // Client-side filtering for search
  const customers = allCustomers.filter((c) => {
    const matchesSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    return matchesSearch
  })

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
    tags: [] as string[],
  })

  const openEditDialog = (customer: Customer) => {
    setEditCustomer(customer)
    setFormData({
      name: customer.name || "",
      phone: customer.phone,
      address: customer.address || "",
      notes: customer.notes || "",
      tags: customer.tags || [],
    })
  }

  const handleUpdate = async () => {
    if (!editCustomer) return
    try {
      await updateMutation.mutateAsync({ id: editCustomer.id, ...formData })
      toast({ title: "Customer updated successfully" })
      setEditCustomer(null)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-2">View customer details and order history</p>
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Customers</h1>
        <p className="text-muted-foreground mt-2">View customer details and order history</p>
      </div>

      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border max-w-md"
          />
          <div className="text-sm text-muted-foreground">
            {customers.length} customers found
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="overflow-x-auto">
          {customers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-foreground font-semibold">Name</TableHead>
                  <TableHead className="text-foreground font-semibold">Phone</TableHead>
                  <TableHead className="text-foreground font-semibold">Orders</TableHead>
                  <TableHead className="text-foreground font-semibold">Total Spent</TableHead>
                  <TableHead className="text-foreground font-semibold">Tags</TableHead>
                  <TableHead className="text-foreground font-semibold">Last Order</TableHead>
                  <TableHead className="text-foreground font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} className="border-b border-border hover:bg-muted/50">
                    <TableCell className="text-foreground font-medium">{customer.name || "Unknown"}</TableCell>
                    <TableCell className="text-foreground">{customer.phone}</TableCell>
                    <TableCell className="text-foreground">{customer._count?.orders || customer.orderCount || 0}</TableCell>
                    <TableCell className="text-foreground">${Number(customer.totalSpent || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {customer.tags?.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="rounded-sm text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground text-sm">
                      {customer.lastOrder?.createdAt ? formatDate(customer.lastOrder.createdAt) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs bg-transparent"
                          onClick={() => setViewCustomer(customer)}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs bg-transparent"
                          onClick={() => openEditDialog(customer)}
                        >
                          <Pencil size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No customers found
            </div>
          )}
        </div>
      </Card>

      {/* View Customer Dialog */}
      <Dialog open={!!viewCustomer} onOpenChange={() => setViewCustomer(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {viewCustomer && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{viewCustomer.name || "Unknown"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{viewCustomer.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{viewCustomer.email || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Orders:</span>
                    <p className="font-medium">{viewCustomer._count?.orders || viewCustomer.orderCount || 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Spent:</span>
                    <p className="font-medium">${Number(viewCustomer.totalSpent || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Since:</span>
                    <p className="font-medium">{viewCustomer.createdAt ? formatDate(viewCustomer.createdAt) : "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="font-medium">{viewCustomer.notes || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Tags:</span>
                    <div className="flex gap-1 mt-1">
                      {viewCustomer.tags?.length ? (
                        viewCustomer.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="rounded-sm">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">No tags</span>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="mt-4">
                <NotificationPreferences
                  customerId={viewCustomer.id}
                  customerEmail={viewCustomer.email}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={!!editCustomer} onOpenChange={() => setEditCustomer(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags.join(", ")}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                placeholder="VIP, Frequent Buyer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomer(null)}>Cancel</Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
