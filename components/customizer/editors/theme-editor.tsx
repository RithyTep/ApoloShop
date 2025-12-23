"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ShopTheme } from "@/lib/api-hooks"

interface ThemeEditorProps {
  theme: ShopTheme
  onChange: (theme: ShopTheme) => void
}

const presetColors = [
  { label: "Rose", color: "oklch(0.72 0.16 356)" },
  { label: "Blue", color: "oklch(0.65 0.15 250)" },
  { label: "Green", color: "oklch(0.72 0.17 142)" },
  { label: "Orange", color: "oklch(0.75 0.15 55)" },
  { label: "Purple", color: "oklch(0.65 0.15 290)" },
  { label: "Teal", color: "oklch(0.70 0.12 180)" },
]

export function ThemeEditor({ theme, onChange }: ThemeEditorProps) {
  const update = (updates: Partial<ShopTheme>) => {
    onChange({ ...theme, ...updates })
  }

  return (
    <div className="space-y-6">
      {/* Branding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Shop Name</Label>
            <Input
              value={theme.shopName || ""}
              onChange={(e) => update({ shopName: e.target.value })}
              placeholder="My Shop"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm">Logo URL</Label>
            <Input
              value={theme.logoUrl || ""}
              onChange={(e) => update({ logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Enter a URL to your logo image (PNG, SVG recommended)
            </p>
            {theme.logoUrl && (
              <div className="mt-2 p-3 bg-muted rounded flex items-center gap-3">
                <img
                  src={theme.logoUrl}
                  alt="Logo preview"
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none"
                  }}
                />
                <span className="text-sm text-muted-foreground">Logo Preview</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Color Presets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {presetColors.map((preset) => (
              <button
                key={preset.label}
                onClick={() => update({ primaryColor: preset.color, accentColor: preset.color })}
                className="group relative"
                title={preset.label}
              >
                <div
                  className="w-10 h-10 rounded-full border-2 border-border hover:border-primary transition-colors"
                  style={{ backgroundColor: preset.color }}
                />
                {theme.primaryColor === preset.color && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full shadow" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Custom Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Primary Color</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded border cursor-pointer"
                style={{ backgroundColor: theme.primaryColor }}
              />
              <Input
                value={theme.primaryColor}
                onChange={(e) => update({ primaryColor: e.target.value })}
                placeholder="oklch(0.72 0.16 356)"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used for buttons, links, and accents. Use OKLch format for best results.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm">Accent Color</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded border cursor-pointer"
                style={{ backgroundColor: theme.accentColor }}
              />
              <Input
                value={theme.accentColor}
                onChange={(e) => update({ accentColor: e.target.value })}
                placeholder="oklch(0.72 0.16 356)"
                className="flex-1"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm">Background Color</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded border cursor-pointer"
                style={{ backgroundColor: theme.backgroundColor }}
              />
              <Input
                value={theme.backgroundColor}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                placeholder="oklch(1 0 0)"
                className="flex-1"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm">Text Color</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded border cursor-pointer"
                style={{ backgroundColor: theme.textColor }}
              />
              <Input
                value={theme.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                placeholder="oklch(0.15 0 0)"
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Border Radius</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Corner Roundness</Label>
              <span className="text-sm text-muted-foreground">{theme.borderRadius}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="16"
              value={theme.borderRadius}
              onChange={(e) => update({ borderRadius: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Square</span>
              <span>Rounded</span>
            </div>
          </div>

          {/* Preview */}
          <div className="flex gap-3 pt-2">
            <div
              className="w-16 h-16 bg-primary flex items-center justify-center text-primary-foreground text-xs"
              style={{
                borderRadius: theme.borderRadius,
                backgroundColor: theme.primaryColor,
              }}
            >
              Button
            </div>
            <div
              className="w-24 h-16 border-2 flex items-center justify-center text-xs"
              style={{ borderRadius: theme.borderRadius }}
            >
              Card
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
