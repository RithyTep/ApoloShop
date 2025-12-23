"use client"

import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const customers = [
  { id: 1, name: "Sophea", phone: "010 123 456", orders: 12, notes: "VIP Customer", lastOrder: "Dec 20" },
  { id: 2, name: "Dara", phone: "010 234 567", orders: 8, notes: "Frequent Buyer", lastOrder: "Dec 18" },
  { id: 3, name: "Nary", phone: "010 345 678", orders: 3, notes: "", lastOrder: "Dec 22" },
]

export function CustomersPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Customers</h1>
        <p className="text-muted-foreground mt-2">View customer details and order history</p>
      </div>

      <Card className="p-4">
        <Input placeholder="Search by name or phone..." className="border-border" />
      </Card>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="text-foreground font-semibold">Name</TableHead>
                <TableHead className="text-foreground font-semibold">Phone</TableHead>
                <TableHead className="text-foreground font-semibold">Orders</TableHead>
                <TableHead className="text-foreground font-semibold">Notes</TableHead>
                <TableHead className="text-foreground font-semibold">Last Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="text-foreground font-medium">{customer.name}</TableCell>
                  <TableCell className="text-foreground">{customer.phone}</TableCell>
                  <TableCell className="text-foreground">{customer.orders}</TableCell>
                  <TableCell>
                    {customer.notes && (
                      <Badge variant="secondary" className="rounded-sm">
                        {customer.notes}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-foreground text-sm">{customer.lastOrder}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
