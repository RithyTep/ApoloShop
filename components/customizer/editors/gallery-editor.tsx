"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ImageUpload } from "@/components/ui/image-upload"
import { GalleryConfig, GalleryImage } from "@/lib/api-hooks"

interface GalleryEditorProps {
  config: GalleryConfig
  onChange: (config: GalleryConfig) => void
}

export function GalleryEditor({ config, onChange }: GalleryEditorProps) {
  const [editingImageId, setEditingImageId] = useState<string | null>(null)

  const update = (updates: Partial<GalleryConfig>) => {
    onChange({ ...config, ...updates })
  }

  const addImage = () => {
    const newImage: GalleryImage = {
      id: `img-${Date.now()}`,
      url: "",
      captionEn: "",
      captionKh: "",
    }
    update({ images: [...config.images, newImage] })
    setEditingImageId(newImage.id)
  }

  const updateImage = (imageId: string, updates: Partial<GalleryImage>) => {
    const newImages = config.images.map((img) => (img.id === imageId ? { ...img, ...updates } : img))
    update({ images: newImages })
  }

  const deleteImage = (imageId: string) => {
    update({ images: config.images.filter((img) => img.id !== imageId) })
    if (editingImageId === imageId) setEditingImageId(null)
  }

  const editingImage = config.images.find((img) => img.id === editingImageId)

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
              placeholder="Our Gallery"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.titleKh}
              onChange={(e) => update({ titleKh: e.target.value })}
              placeholder="វិចិត្រសាលរបស់យើង"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Layout */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Layout</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Display</Label>
            <Select value={config.layout} onValueChange={(v) => update({ layout: v as "grid" | "masonry" | "carousel" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="masonry">Masonry</SelectItem>
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
      </div>

      <Separator />

      {/* Images List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Images</Label>
          <Button size="sm" variant="outline" onClick={addImage}>
            <Plus size={14} className="mr-1" />
            Add Image
          </Button>
        </div>

        <div className="space-y-2">
          {config.images.map((image) => (
            <div
              key={image.id}
              className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                editingImageId === image.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => setEditingImageId(image.id)}
            >
              <GripVertical size={14} className="text-muted-foreground" />
              {image.url ? (
                <img src={image.url} alt="" className="w-10 h-10 object-cover rounded" />
              ) : (
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                  No img
                </div>
              )}
              <span className="flex-1 text-sm truncate">
                {image.captionEn || "Untitled"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteImage(image.id)
                }}
              >
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {config.images.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No images yet. Click "Add Image" to create one.
          </p>
        )}
      </div>

      {/* Image Editor */}
      {editingImage && (
        <>
          <Separator />
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium">Edit Image</Label>

            <div>
              <Label className="text-xs text-muted-foreground">Image</Label>
              <ImageUpload
                value={editingImage.url}
                onChange={(url) => updateImage(editingImage.id, { url })}
                onRemove={() => updateImage(editingImage.id, { url: "" })}
                folder="gallery"
                aspectRatio="square"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Caption (EN)</Label>
                <Input
                  value={editingImage.captionEn || ""}
                  onChange={(e) => updateImage(editingImage.id, { captionEn: e.target.value })}
                  placeholder="Optional caption"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Caption (KH)</Label>
                <Input
                  value={editingImage.captionKh || ""}
                  onChange={(e) => updateImage(editingImage.id, { captionKh: e.target.value })}
                  placeholder="ចំណងជើងជាជម្រើស"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
