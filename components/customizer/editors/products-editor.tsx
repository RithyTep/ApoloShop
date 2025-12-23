"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ProductsConfig } from "@/lib/api-hooks"
import { useCategories } from "@/lib/api-hooks"

interface ProductsEditorProps {
  config: ProductsConfig
  onChange: (config: ProductsConfig) => void
}

export function ProductsEditor({ config, onChange }: ProductsEditorProps) {
  const { data: categoriesData } = useCategories()
  const categories = categoriesData?.categories?.filter((c) => c.isActive) || []

  const update = (updates: Partial<ProductsConfig>) => {
    onChange({ ...config, ...updates })
  }

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Section Title</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">English</Label>
            <Input
              value={config.titleEn}
              onChange={(e) => update({ titleEn: e.target.value })}
              placeholder="Featured Products"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.titleKh}
              onChange={(e) => update({ titleKh: e.target.value })}
              placeholder="ផលិតផលពិសេស"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Display Type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Product Selection</Label>
        <div>
          <Label className="text-xs text-muted-foreground">Display Type</Label>
          <Select
            value={config.displayType}
            onValueChange={(v) => update({ displayType: v as ProductsConfig["displayType"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured Products</SelectItem>
              <SelectItem value="new_arrivals">New Arrivals</SelectItem>
              <SelectItem value="bestsellers">Bestsellers</SelectItem>
              <SelectItem value="category">By Category</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.displayType === "category" && (
          <div>
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={config.categoryId || ""} onValueChange={(v) => update({ categoryId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Separator />

      {/* Layout */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Layout</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Display</Label>
            <Select value={config.layout} onValueChange={(v) => update({ layout: v as "grid" | "carousel" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Columns</Label>
            <Select value={String(config.columns)} onValueChange={(v) => update({ columns: parseInt(v) as 2 | 3 | 4 })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Columns</SelectItem>
                <SelectItem value="3">3 Columns</SelectItem>
                <SelectItem value="4">4 Columns</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Max Products</Label>
          <Input
            type="number"
            min={1}
            max={24}
            value={config.maxProducts}
            onChange={(e) => update({ maxProducts: parseInt(e.target.value) || 8 })}
          />
        </div>
      </div>

      <Separator />

      {/* Display Options */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Display Options</Label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Show Price</Label>
            <Switch checked={config.showPrice} onCheckedChange={(v) => update({ showPrice: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Show Stock Status</Label>
            <Switch checked={config.showStock} onCheckedChange={(v) => update({ showStock: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Show Add to Cart Button</Label>
            <Switch checked={config.showAddToCart} onCheckedChange={(v) => update({ showAddToCart: v })} />
          </div>
        </div>
      </div>
    </div>
  )
}
