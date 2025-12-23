"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { AnnouncementConfig } from "@/lib/api-hooks"

interface AnnouncementEditorProps {
  config: AnnouncementConfig
  onChange: (config: AnnouncementConfig) => void
}

export function AnnouncementEditor({ config, onChange }: AnnouncementEditorProps) {
  const update = (updates: Partial<AnnouncementConfig>) => {
    onChange({ ...config, ...updates })
  }

  return (
    <div className="space-y-6">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Enable Banner</Label>
          <p className="text-xs text-muted-foreground">Show announcement at the top of the page</p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => update({ enabled: checked })}
        />
      </div>

      <Separator />

      {/* Banner Text */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Banner Text</Label>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">English</Label>
            <Input
              value={config.textEn}
              onChange={(e) => update({ textEn: e.target.value })}
              placeholder="Free delivery on orders over $20!"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.textKh}
              onChange={(e) => update({ textKh: e.target.value })}
              placeholder="ដឹកជញ្ជូនឥតគិតថ្លៃសម្រាប់ការបញ្ជាទិញលើស $២០!"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Optional Link */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Link (Optional)</Label>
        <div>
          <Label className="text-xs text-muted-foreground">Link URL</Label>
          <Input
            value={config.linkUrl || ""}
            onChange={(e) => update({ linkUrl: e.target.value })}
            placeholder="https://example.com/promo"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Link Text (EN)</Label>
            <Input
              value={config.linkTextEn || ""}
              onChange={(e) => update({ linkTextEn: e.target.value })}
              placeholder="Learn More"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Link Text (KH)</Label>
            <Input
              value={config.linkTextKh || ""}
              onChange={(e) => update({ linkTextKh: e.target.value })}
              placeholder="ស្វែងយល់បន្ថែម"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Styling */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Styling</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Background Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={config.backgroundColor}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={config.backgroundColor}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                placeholder="#f97316"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Text Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={config.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={config.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Behavior */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Behavior</Label>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Dismissible</Label>
            <p className="text-xs text-muted-foreground">Allow users to close the banner</p>
          </div>
          <Switch
            checked={config.isDismissible}
            onCheckedChange={(checked) => update({ isDismissible: checked })}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Show On</Label>
          <Select
            value={config.showOnPages}
            onValueChange={(v) => update({ showOnPages: v as "all" | "home" | "checkout" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pages</SelectItem>
              <SelectItem value="home">Home Only</SelectItem>
              <SelectItem value="checkout">Checkout Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Schedule */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Schedule (Optional)</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Start Date</Label>
            <Input
              type="date"
              value={config.startDate || ""}
              onChange={(e) => update({ startDate: e.target.value || undefined })}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">End Date</Label>
            <Input
              type="date"
              value={config.endDate || ""}
              onChange={(e) => update({ endDate: e.target.value || undefined })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Leave empty to show indefinitely
        </p>
      </div>
    </div>
  )
}
