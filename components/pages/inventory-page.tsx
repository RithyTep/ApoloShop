"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

const inventory = [
  { id: 1, product: "Iced Coffee", sku: "COF-001", stock: 45, minLevel: 10, status: "Good" },
  { id: 2, product: "Latte", sku: "COF-003", stock: 8, minLevel: 10, status: "Low" },
  { id: 3, product: "Cappuccino", sku: "COF-004", stock: 0, minLevel: 10, status: "Out of Stock" },
]

export function InventoryPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
        <p className="text-muted-foreground mt-2">Track stock levels and manage inventory</p>
      </div>

      <Card className="p-4">
        <Input placeholder="Search by product name..." className="border-border" />
      </Card>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="text-foreground font-semibold">Product</TableHead>
                <TableHead className="text-foreground font-semibold">SKU</TableHead>
                <TableHead className="text-foreground font-semibold">Current Stock</TableHead>
                <TableHead className="text-foreground font-semibold">Min Level</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-foreground font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item.id} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="text-foreground font-medium">{item.product}</TableCell>
                  <TableCell className="text-foreground">{item.sku}</TableCell>
                  <TableCell className="text-foreground">{item.stock}</TableCell>
                  <TableCell className="text-foreground">{item.minLevel}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "Out of Stock" ? "destructive" : item.status === "Low" ? "secondary" : "default"
                      }
                      className="rounded-sm"
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="text-xs bg-transparent">
                      Adjust
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
