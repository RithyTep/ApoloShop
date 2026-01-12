"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical, User, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/ui/image-upload"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TestimonialsConfig, Testimonial } from "@/lib/api-hooks"

interface TestimonialsEditorProps {
  config: TestimonialsConfig
  onChange: (config: TestimonialsConfig) => void
}

export function TestimonialsEditor({ config, onChange }: TestimonialsEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const update = (updates: Partial<TestimonialsConfig>) => {
    onChange({ ...config, ...updates })
  }

  const addTestimonial = () => {
    const newItem: Testimonial = {
      id: `testimonial-${Date.now()}`,
      name: "New Customer",
      roleEn: "Customer",
      roleKh: "អតិថិជន",
      contentEn: "Great experience!",
      contentKh: "បទពិសោធន៍ដ៏អស្ចារ្យ!",
      imageUrl: "",
      rating: 5,
    }
    update({ testimonials: [...config.testimonials, newItem] })
    setEditingId(newItem.id)
  }

  const updateItem = (id: string, updates: Partial<Testimonial>) => {
    const newItems = config.testimonials.map((t) => (t.id === id ? { ...t, ...updates } : t))
    update({ testimonials: newItems })
  }

  const deleteItem = (id: string) => {
    update({ testimonials: config.testimonials.filter((t) => t.id !== id) })
    if (editingId === id) setEditingId(null)
  }

  const editingItem = config.testimonials.find((t) => t.id === editingId)

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
              placeholder="What Our Customers Say"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.titleKh}
              onChange={(e) => update({ titleKh: e.target.value })}
              placeholder="អ្វីដែលអតិថិជនរបស់យើងនិយាយ"
            />
          </div>
        </div>
      </div>

      {/* Layout Settings */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Layout</Label>
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
          <Select value={String(config.columns)} onValueChange={(v) => update({ columns: Number(v) as 2 | 3 })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Columns</SelectItem>
              <SelectItem value="3">3 Columns</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Testimonials List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Testimonials</Label>
          <Button size="sm" variant="outline" onClick={addTestimonial}>
            <Plus size={14} className="mr-1" />
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {config.testimonials.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                editingId === item.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => setEditingId(item.id)}
            >
              <GripVertical size={14} className="text-muted-foreground" />
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="w-10 h-10 object-cover rounded-full" />
              ) : (
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <User size={18} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={10}
                      className={i < item.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}
                    />
                  ))}
                </div>
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

        {config.testimonials.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No testimonials yet. Click "Add" to create one.
          </p>
        )}
      </div>

      {/* Item Editor */}
      {editingItem && (
        <>
          <Separator />
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium">Edit: {editingItem.name}</Label>

            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={editingItem.name}
                onChange={(e) => updateItem(editingItem.id, { name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Role (EN)</Label>
                <Input
                  value={editingItem.roleEn}
                  onChange={(e) => updateItem(editingItem.id, { roleEn: e.target.value })}
                  placeholder="Customer"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Role (KH)</Label>
                <Input
                  value={editingItem.roleKh}
                  onChange={(e) => updateItem(editingItem.id, { roleKh: e.target.value })}
                  placeholder="អតិថិជន"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Rating</Label>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => updateItem(editingItem.id, { rating: i + 1 })}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      size={20}
                      className={i < editingItem.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Testimonial (EN)</Label>
              <Textarea
                value={editingItem.contentEn}
                onChange={(e) => updateItem(editingItem.id, { contentEn: e.target.value })}
                placeholder="Share their experience..."
                rows={3}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Testimonial (KH)</Label>
              <Textarea
                value={editingItem.contentKh}
                onChange={(e) => updateItem(editingItem.id, { contentKh: e.target.value })}
                placeholder="ចែករំលែកបទពិសោធន៍..."
                rows={3}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Photo</Label>
              <ImageUpload
                value={editingItem.imageUrl || ""}
                onChange={(url) => updateItem(editingItem.id, { imageUrl: url })}
                onRemove={() => updateItem(editingItem.id, { imageUrl: "" })}
                folder="testimonials"
                aspectRatio="square"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
