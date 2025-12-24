"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ImageUpload } from "@/components/ui/image-upload"
import { HeroConfig } from "@/lib/api-hooks"

interface HeroEditorProps {
  config: HeroConfig
  onChange: (config: HeroConfig) => void
}

export function HeroEditor({ config, onChange }: HeroEditorProps) {
  const update = (updates: Partial<HeroConfig>) => {
    onChange({ ...config, ...updates })
  }

  return (
    <div className="space-y-6">
      {/* Media */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Background Image</Label>
        <ImageUpload
          value={config.mediaUrl}
          onChange={(url) => update({ mediaUrl: url, mediaType: "image" })}
          onRemove={() => update({ mediaUrl: "" })}
          folder="hero"
          aspectRatio="video"
        />
      </div>

      <Separator />

      {/* Title */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Title</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">English</Label>
            <Input
              value={config.titleEn}
              onChange={(e) => update({ titleEn: e.target.value })}
              placeholder="Welcome"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.titleKh}
              onChange={(e) => update({ titleKh: e.target.value })}
              placeholder="សូមស្វាគមន៍"
            />
          </div>
        </div>
      </div>

      {/* Subtitle */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Subtitle</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">English</Label>
            <Textarea
              value={config.subtitleEn}
              onChange={(e) => update({ subtitleEn: e.target.value })}
              placeholder="Discover amazing products"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Textarea
              value={config.subtitleKh}
              onChange={(e) => update({ subtitleKh: e.target.value })}
              placeholder="ស្វែងរកផលិតផល"
              rows={2}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* CTA Button */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Call to Action Button</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Text (EN)</Label>
            <Input
              value={config.ctaTextEn}
              onChange={(e) => update({ ctaTextEn: e.target.value })}
              placeholder="Shop Now"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Text (KH)</Label>
            <Input
              value={config.ctaTextKh}
              onChange={(e) => update({ ctaTextKh: e.target.value })}
              placeholder="ទិញឥឡូវ"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Link URL</Label>
          <Input
            value={config.ctaLink}
            onChange={(e) => update({ ctaLink: e.target.value })}
            placeholder="#products"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Button Style</Label>
          <Select value={config.ctaStyle} onValueChange={(v) => update({ ctaStyle: v as HeroConfig["ctaStyle"] })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary (Filled)</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="ghost">Ghost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Layout Options */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Layout</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Text Alignment</Label>
            <Select value={config.textAlignment} onValueChange={(v) => update({ textAlignment: v as HeroConfig["textAlignment"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Height</Label>
            <Select value={config.height} onValueChange={(v) => update({ height: v as HeroConfig["height"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (300px)</SelectItem>
                <SelectItem value="medium">Medium (400px)</SelectItem>
                <SelectItem value="large">Large (500px)</SelectItem>
                <SelectItem value="full">Full Screen</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Overlay */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Overlay</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={config.overlayColor}
                onChange={(e) => update({ overlayColor: e.target.value })}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={config.overlayColor}
                onChange={(e) => update({ overlayColor: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Opacity ({config.overlayOpacity}%)</Label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.overlayOpacity}
              onChange={(e) => update({ overlayOpacity: parseInt(e.target.value) })}
              className="w-full mt-2"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
