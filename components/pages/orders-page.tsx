"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download } from "phosphor-react"

const orders = [
  {
    id: "#001",
    customer: "Sophea",
    phone: "010 123 456",
    amount: "$45.50",
    currency: "USD",
    status: "Confirmed",
    channel: "Website",
  },
  {
    id: "#002",
    customer: "Dara",
    phone: "010 234 567",
    amount: "៛215,000",
    currency: "KHR",
    status: "Preparing",
    channel: "Telegram",
  },
  {
    id: "#003",
    customer: "Nary",
    phone: "010 345 678",
    amount: "$32.00",
    currency: "USD",
    status: "New",
    channel: "Website",
  },
  {
    id: "#004",
    customer: "Sokha",
    phone: "010 456 789",
    amount: "៛145,000",
    currency: "KHR",
    status: "Completed",
    channel: "Messenger",
  },
  {
    id: "#005",
    customer: "Pich",
    phone: "010 567 890",
    amount: "$78.25",
    currency: "USD",
    status: "Confirmed",
    channel: "Website",
  },
]

export function OrdersPage() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-2">Manage and track all customer orders</p>
        </div>
        <Button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Download size={16} /> Export to Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input placeholder="Search by order ID..." className="border-border" />
          <Input placeholder="Search by customer..." className="border-border" />
          <select className="px-3 py-2 border border-border bg-background rounded text-sm">
            <option>All Status</option>
            <option>New</option>
            <option>Confirmed</option>
            <option>Preparing</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
          <select className="px-3 py-2 border border-border bg-background rounded text-sm">
            <option>All Channels</option>
            <option>Website</option>
            <option>Telegram</option>
            <option>Messenger</option>
          </select>
        </div>
      </Card>

      {/* Orders Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="text-foreground font-semibold">Order ID</TableHead>
                <TableHead className="text-foreground font-semibold">Customer</TableHead>
                <TableHead className="text-foreground font-semibold">Phone</TableHead>
                <TableHead className="text-foreground font-semibold">Amount</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-foreground font-semibold">Channel</TableHead>
                <TableHead className="text-foreground font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="text-foreground font-medium">{order.id}</TableCell>
                  <TableCell className="text-foreground">{order.customer}</TableCell>
                  <TableCell className="text-foreground">{order.phone}</TableCell>
                  <TableCell className="text-foreground">{order.amount}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.status === "Completed"
                          ? "default"
                          : order.status === "Cancelled"
                            ? "destructive"
                            : "secondary"
                      }
                      className="rounded-sm"
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground text-sm">{order.channel}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="text-xs bg-transparent">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
