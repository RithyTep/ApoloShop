"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical, Zap, Shield, Truck, Clock, Heart, Star, Gift, Award, Sparkles, ThumbsUp, Check, Headphones, CreditCard, RotateCcw, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FeaturesConfig, Feature } from "@/lib/api-hooks"

interface FeaturesEditorProps {
  config: FeaturesConfig
  onChange: (config: FeaturesConfig) => void
}

const iconOptions = [
  { value: "zap", label: "Zap", icon: Zap },
  { value: "shield", label: "Shield", icon: Shield },
  { value: "truck", label: "Truck", icon: Truck },
  { value: "clock", label: "Clock", icon: Clock },
  { value: "heart", label: "Heart", icon: Heart },
  { value: "star", label: "Star", icon: Star },
  { value: "gift", label: "Gift", icon: Gift },
  { value: "award", label: "Award", icon: Award },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "thumbsUp", label: "Thumbs Up", icon: ThumbsUp },
  { value: "check", label: "Check", icon: Check },
  { value: "headphones", label: "Support", icon: Headphones },
  { value: "creditCard", label: "Payment", icon: CreditCard },
  { value: "rotateCcw", label: "Return", icon: RotateCcw },
  { value: "package", label: "Package", icon: Package },
]

export function getFeatureIcon(iconName: string, size: number = 18) {
  const iconDef = iconOptions.find((i) => i.value === iconName)
  if (iconDef) {
    const IconComponent = iconDef.icon
    return <IconComponent size={size} />
  }
  return <Zap size={size} />
}

export function FeaturesEditor({ config, onChange }: FeaturesEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const update = (updates: Partial<FeaturesConfig>) => {
    onChange({ ...config, ...updates })
  }

  const addFeature = () => {
    const newItem: Feature = {
      id: `feature-${Date.now()}`,
      icon: "zap",
      titleEn: "New Feature",
      titleKh: "មុខងារថ្មី",
      descriptionEn: "Describe this feature...",
      descriptionKh: "ពិពណ៌នាមុខងារនេះ...",
    }
    update({ features: [...config.features, newItem] })
    setEditingId(newItem.id)
  }

  const updateItem = (id: string, updates: Partial<Feature>) => {
    const newItems = config.features.map((f) => (f.id === id ? { ...f, ...updates } : f))
    update({ features: newItems })
  }

  const deleteItem = (id: string) => {
    update({ features: config.features.filter((f) => f.id !== id) })
    if (editingId === id) setEditingId(null)
  }

  const editingItem = config.features.find((f) => f.id === editingId)

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
              placeholder="Why Choose Us"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.titleKh}
              onChange={(e) => update({ titleKh: e.target.value })}
              placeholder="ហេតុអ្វីជ្រើសរើសយើង"
            />
          </div>
        </div>
      </div>

      {/* Subtitle */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Subtitle (Optional)</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">English</Label>
            <Input
              value={config.subtitleEn}
              onChange={(e) => update({ subtitleEn: e.target.value })}
              placeholder="What makes us different"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.subtitleKh}
              onChange={(e) => update({ subtitleKh: e.target.value })}
              placeholder="អ្វីដែលធ្វើឱ្យយើងខុសគេ"
            />
          </div>
        </div>
      </div>

      {/* Layout Settings */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Layout</Label>
          <Select value={config.layout} onValueChange={(v) => update({ layout: v as "grid" | "list" })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="list">List</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Columns</Label>
          <Select value={String(config.columns)} onValueChange={(v) => update({ columns: Number(v) as 2 | 3 | 4 })}>
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

      <Separator />

      {/* Features List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Features</Label>
          <Button size="sm" variant="outline" onClick={addFeature}>
            <Plus size={14} className="mr-1" />
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {config.features.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                editingId === item.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => setEditingId(item.id)}
            >
              <GripVertical size={14} className="text-muted-foreground" />
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                {getFeatureIcon(item.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.titleEn}</p>
                <p className="text-xs text-muted-foreground truncate">{item.descriptionEn}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteItem(item.id)
                }}
              >
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {config.features.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No features yet. Click "Add" to create one.
          </p>
        )}
      </div>

      {/* Item Editor */}
      {editingItem && (
        <>
          <Separator />
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium">Edit: {editingItem.titleEn}</Label>

            <div>
              <Label className="text-xs text-muted-foreground">Icon</Label>
              <Select value={editingItem.icon} onValueChange={(v) => updateItem(editingItem.id, { icon: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon size={16} />
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Title (EN)</Label>
                <Input
                  value={editingItem.titleEn}
                  onChange={(e) => updateItem(editingItem.id, { titleEn: e.target.value })}
                  placeholder="Fast Delivery"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Title (KH)</Label>
                <Input
                  value={editingItem.titleKh}
                  onChange={(e) => updateItem(editingItem.id, { titleKh: e.target.value })}
                  placeholder="ដឹកជញ្ជូនលឿន"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Description (EN)</Label>
              <Textarea
                value={editingItem.descriptionEn}
                onChange={(e) => updateItem(editingItem.id, { descriptionEn: e.target.value })}
                placeholder="Describe the feature..."
                rows={2}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Description (KH)</Label>
              <Textarea
                value={editingItem.descriptionKh}
                onChange={(e) => updateItem(editingItem.id, { descriptionKh: e.target.value })}
                placeholder="ពិពណ៌នាមុខងារ..."
                rows={2}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
