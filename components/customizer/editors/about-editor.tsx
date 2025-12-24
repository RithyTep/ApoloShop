"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ImageUpload } from "@/components/ui/image-upload"
import { AboutConfig } from "@/lib/api-hooks"

interface AboutEditorProps {
  config: AboutConfig
  onChange: (config: AboutConfig) => void
}

export function AboutEditor({ config, onChange }: AboutEditorProps) {
  const update = (updates: Partial<AboutConfig>) => {
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
              placeholder="About Us"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.titleKh}
              onChange={(e) => update({ titleKh: e.target.value })}
              placeholder="អំពីយើង"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Content */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Content</Label>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">English</Label>
            <Textarea
              value={config.contentEn}
              onChange={(e) => update({ contentEn: e.target.value })}
              placeholder="Tell your story... You can use multiple paragraphs by adding blank lines."
              rows={6}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Textarea
              value={config.contentKh}
              onChange={(e) => update({ contentKh: e.target.value })}
              placeholder="រៀបរាប់រឿងរ៉ាវរបស់អ្នក..."
              rows={6}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Image */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Image (Optional)</Label>
        <ImageUpload
          value={config.imageUrl || ""}
          onChange={(url) => update({ imageUrl: url })}
          onRemove={() => update({ imageUrl: undefined })}
          folder="about"
          aspectRatio="video"
        />
        {config.imageUrl && (
          <div>
            <Label className="text-xs text-muted-foreground">Image Position</Label>
            <Select
              value={config.imagePosition}
              onValueChange={(v) => update({ imagePosition: v as "left" | "right" | "top" | "bottom" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
