"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, GripVertical } from "phosphor-react"

const categories = [
  { id: 1, name: "Coffee", nameKh: "កាហ្វេ", enabled: true },
  { id: 2, name: "Tea", nameKh: "តែ", enabled: true },
  { id: 3, name: "Snacks", nameKh: "អាហារស្វល់ស្វាទ", enabled: true },
]

export function CategoriesPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categories</h1>
          <p className="text-muted-foreground mt-2">Manage product categories with drag & drop reordering</p>
        </div>
        <Button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} /> Add Category
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-4 p-4 border border-border hover:bg-muted/50">
            <GripVertical size={20} className="text-muted-foreground cursor-grab" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{cat.name}</p>
              <p className="text-sm text-muted-foreground">{cat.nameKh}</p>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked={cat.enabled} className="w-4 h-4" />
              <span className="text-sm text-foreground">Enabled</span>
            </label>
          </div>
        ))}
      </Card>
    </div>
  )
}
