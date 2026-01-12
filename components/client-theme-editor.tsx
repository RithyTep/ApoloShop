"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Palette, Image, Eye, Loader2 } from "lucide-react"
import { ClientTheme, useClientTheme, useUpdateClientTheme } from "@/lib/api-hooks"
import { useClientThemeInlineStyles } from "@/lib/use-client-theme"
import { useToast } from "@/components/ui/use-toast"

interface ClientThemeEditorProps {
  clientId?: string
  clientSlug?: string
}

const presetColors = [
  { label: "Rose", color: "oklch(0.72 0.16 356)" },
  { label: "Blue", color: "oklch(0.65 0.15 250)" },
  { label: "Green", color: "oklch(0.72 0.17 142)" },
  { label: "Orange", color: "oklch(0.75 0.15 55)" },
  { label: "Purple", color: "oklch(0.65 0.15 290)" },
  { label: "Teal", color: "oklch(0.70 0.12 180)" },
]

export function ClientThemeEditor({ clientId, clientSlug }: ClientThemeEditorProps) {
  const { toast } = useToast()
  const { data: clientData, isLoading } = useClientTheme(clientSlug)
  const updateMutation = useUpdateClientTheme()

  const [theme, setTheme] = useState<ClientTheme>({
    primaryColor: null,
    secondaryColor: null,
    logoUrl: null,
    faviconUrl: null,
  })

  const [showPreview, setShowPreview] = useState(false)

  // Load theme when data arrives
  useEffect(() => {
    if (clientData?.theme) {
      setTheme(clientData.theme)
    }
  }, [clientData])

  // Generate inline styles for preview
  const previewStyles = useClientThemeInlineStyles(theme)

  const effectiveClientId = clientId || clientData?.client?.id

  const handleSave = async () => {
    if (!effectiveClientId) {
      toast({
        title: "Error",
        description: "No client selected",
        variant: "destructive",
      })
      return
    }

    try {
      await updateMutation.mutateAsync({
        clientId: effectiveClientId,
        theme,
      })
      toast({ title: "Client theme saved successfully" })
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const updateTheme = (updates: Partial<ClientTheme>) => {
    setTheme((prev) => ({ ...prev, ...updates }))
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading client theme...
        </div>
      </Card>
    )
  }

  if (!clientData?.client) {
    return (
      <Card className="p-6">
        <div className="text-muted-foreground text-sm">
          No client detected. Client-specific theming requires multi-tenant mode.
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette size={18} />
          Client Theme: {clientData.client.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Presets */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Color Presets</Label>
          <div className="flex flex-wrap gap-2">
            {presetColors.map((preset) => (
              <button
                key={preset.label}
                onClick={() =>
                  updateTheme({
                    primaryColor: preset.color,
                    secondaryColor: preset.color,
                  })
                }
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
        </div>

        <Separator />

        {/* Custom Colors */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Primary Color</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded border cursor-pointer shrink-0"
                style={{ backgroundColor: theme.primaryColor || "#888" }}
              />
              <Input
                value={theme.primaryColor || ""}
                onChange={(e) => updateTheme({ primaryColor: e.target.value || null })}
                placeholder="oklch(0.72 0.16 356)"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used for buttons, links, and accents. Use OKLch format.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Secondary Color</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded border cursor-pointer shrink-0"
                style={{ backgroundColor: theme.secondaryColor || "#888" }}
              />
              <Input
                value={theme.secondaryColor || ""}
                onChange={(e) => updateTheme({ secondaryColor: e.target.value || null })}
                placeholder="oklch(0.65 0.15 250)"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Logo & Favicon */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Image size={14} />
              Logo URL
            </Label>
            <Input
              value={theme.logoUrl || ""}
              onChange={(e) => updateTheme({ logoUrl: e.target.value || null })}
              placeholder="https://example.com/logo.png"
            />
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

          <div className="space-y-2">
            <Label className="text-sm">Favicon URL</Label>
            <Input
              value={theme.faviconUrl || ""}
              onChange={(e) => updateTheme({ faviconUrl: e.target.value || null })}
              placeholder="https://example.com/favicon.ico"
            />
            {theme.faviconUrl && (
              <div className="mt-2 p-3 bg-muted rounded flex items-center gap-3">
                <img
                  src={theme.faviconUrl}
                  alt="Favicon preview"
                  className="h-6 w-6 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none"
                  }}
                />
                <span className="text-sm text-muted-foreground">Favicon Preview</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Preview Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Theme Preview</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              <Eye size={14} />
              {showPreview ? "Hide Preview" : "Show Preview"}
            </Button>
          </div>

          {showPreview && (
            <div
              className="p-4 rounded-lg border bg-background"
              style={previewStyles}
            >
              <div className="space-y-3">
                {/* Header preview */}
                <div className="flex items-center gap-3 pb-3 border-b">
                  {theme.logoUrl ? (
                    <img
                      src={theme.logoUrl}
                      alt="Logo"
                      className="h-8 w-auto object-contain"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
                      style={{
                        backgroundColor: theme.primaryColor || "var(--primary)",
                      }}
                    >
                      {clientData.client.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold">{clientData.client.name}</span>
                </div>

                {/* Button preview */}
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 rounded text-white text-sm font-medium"
                    style={{
                      backgroundColor: theme.primaryColor || "var(--primary)",
                    }}
                  >
                    Primary Button
                  </button>
                  <button
                    className="px-4 py-2 rounded text-white text-sm font-medium"
                    style={{
                      backgroundColor: theme.secondaryColor || "var(--accent)",
                    }}
                  >
                    Secondary
                  </button>
                </div>

                {/* Card preview */}
                <div className="p-3 rounded border">
                  <p
                    className="font-medium"
                    style={{ color: theme.primaryColor || "var(--primary)" }}
                  >
                    Product Name
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Preview of how your theme colors will appear
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || !effectiveClientId}
          className="w-full"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Client Theme"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
