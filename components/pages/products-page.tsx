"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash } from "lucide-react"

const products = [
  { id: 1, name: "Iced Coffee", nameKh: "កាហ្វេ​រ​ធ្ងន់", price: "$3.50", stock: 45, sku: "COF-001", active: true },
  { id: 2, name: "Espresso", nameKh: "អេស​ប​រេ​សូ", price: "$4.00", stock: 32, sku: "COF-002", active: true },
  { id: 3, name: "Latte", nameKh: "ឡាតេ", price: "$4.50", stock: 8, sku: "COF-003", active: true },
  { id: 4, name: "Cappuccino", nameKh: "ក​ព៉ូ​ឈី​នូ", price: "$5.00", stock: 0, sku: "COF-004", active: false },
]

export function ProductsPage() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-2">Manage your shop products and inventory</p>
        </div>
        <Button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="Search by product name..." className="border-border" />
          <select className="px-3 py-2 border border-border bg-background rounded text-sm">
            <option>All Categories</option>
            <option>Coffee</option>
            <option>Tea</option>
            <option>Snacks</option>
          </select>
          <select className="px-3 py-2 border border-border bg-background rounded text-sm">
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="text-foreground font-semibold">Product Name</TableHead>
                <TableHead className="text-foreground font-semibold">Khmer Name</TableHead>
                <TableHead className="text-foreground font-semibold">Price</TableHead>
                <TableHead className="text-foreground font-semibold">Stock</TableHead>
                <TableHead className="text-foreground font-semibold">SKU</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-foreground font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="text-foreground font-medium">{product.name}</TableCell>
                  <TableCell className="text-foreground">{product.nameKh}</TableCell>
                  <TableCell className="text-foreground">{product.price}</TableCell>
                  <TableCell>
                    <Badge
                      variant={product.stock === 0 ? "destructive" : product.stock < 15 ? "secondary" : "default"}
                      className="rounded-sm"
                    >
                      {product.stock} units
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground text-sm">{product.sku}</TableCell>
                  <TableCell>
                    <Badge variant={product.active ? "default" : "secondary"} className="rounded-sm">
                      {product.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs bg-transparent">
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive bg-transparent"
                    >
                      <Trash size={14} />
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
