"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { FooterConfig, FooterColumn } from "@/lib/api-hooks"

interface FooterEditorProps {
  config: FooterConfig
  onChange: (config: FooterConfig) => void
}

export function FooterEditor({ config, onChange }: FooterEditorProps) {
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)

  const update = (updates: Partial<FooterConfig>) => {
    onChange({ ...config, ...updates })
  }

  const addColumn = () => {
    const newColumn: FooterColumn = {
      id: `col-${Date.now()}`,
      titleEn: "New Column",
      titleKh: "ជួរថ្មី",
      type: "links",
      links: [],
    }
    update({ columns: [...config.columns, newColumn] })
    setEditingColumnId(newColumn.id)
  }

  const updateColumn = (columnId: string, updates: Partial<FooterColumn>) => {
    const newColumns = config.columns.map((c) => (c.id === columnId ? { ...c, ...updates } : c))
    update({ columns: newColumns })
  }

  const deleteColumn = (columnId: string) => {
    update({ columns: config.columns.filter((c) => c.id !== columnId) })
    if (editingColumnId === columnId) setEditingColumnId(null)
  }

  const addLinkToColumn = (columnId: string) => {
    const column = config.columns.find((c) => c.id === columnId)
    if (!column) return
    const newLink = { textEn: "New Link", textKh: "តំណថ្មី", url: "#" }
    updateColumn(columnId, { links: [...(column.links || []), newLink] })
  }

  const updateLink = (columnId: string, linkIndex: number, updates: Partial<{ textEn: string; textKh: string; url: string }>) => {
    const column = config.columns.find((c) => c.id === columnId)
    if (!column?.links) return
    const newLinks = column.links.map((l, i) => (i === linkIndex ? { ...l, ...updates } : l))
    updateColumn(columnId, { links: newLinks })
  }

  const deleteLink = (columnId: string, linkIndex: number) => {
    const column = config.columns.find((c) => c.id === columnId)
    if (!column?.links) return
    updateColumn(columnId, { links: column.links.filter((_, i) => i !== linkIndex) })
  }

  const editingColumn = config.columns.find((c) => c.id === editingColumnId)

  return (
    <div className="space-y-6">
      {/* Colors */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Colors</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Background</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value="#1a1a1a"
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={config.backgroundColor}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="flex-1"
                placeholder="oklch(0.15 0 0)"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Text</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value="#e5e5e5"
                onChange={(e) => update({ textColor: e.target.value })}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={config.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                className="flex-1"
                placeholder="oklch(0.9 0 0)"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Columns */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Footer Columns</Label>
          <Button size="sm" variant="outline" onClick={addColumn}>
            <Plus size={14} className="mr-1" />
            Add Column
          </Button>
        </div>

        <div className="space-y-2">
          {config.columns.map((column) => (
            <div
              key={column.id}
              className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                editingColumnId === column.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => setEditingColumnId(column.id)}
            >
              <span className="flex-1 text-sm">{column.titleEn}</span>
              <span className="text-xs text-muted-foreground">{column.links?.length || 0} links</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteColumn(column.id)
                }}
              >
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {config.columns.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No columns yet. Click "Add Column" to create one.
          </p>
        )}
      </div>

      {/* Column Editor */}
      {editingColumn && (
        <>
          <Separator />
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium">Editing: {editingColumn.titleEn}</Label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Title (EN)</Label>
                <Input
                  value={editingColumn.titleEn}
                  onChange={(e) => updateColumn(editingColumn.id, { titleEn: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Title (KH)</Label>
                <Input
                  value={editingColumn.titleKh}
                  onChange={(e) => updateColumn(editingColumn.id, { titleKh: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Links</Label>
                <Button size="sm" variant="ghost" onClick={() => addLinkToColumn(editingColumn.id)}>
                  <Plus size={12} className="mr-1" />
                  Add Link
                </Button>
              </div>
              {editingColumn.links?.map((link, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-background rounded border">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input
                      value={link.textEn}
                      onChange={(e) => updateLink(editingColumn.id, index, { textEn: e.target.value })}
                      placeholder="EN"
                      className="h-8 text-xs"
                    />
                    <Input
                      value={link.textKh}
                      onChange={(e) => updateLink(editingColumn.id, index, { textKh: e.target.value })}
                      placeholder="KH"
                      className="h-8 text-xs"
                    />
                    <Input
                      value={link.url}
                      onChange={(e) => updateLink(editingColumn.id, index, { url: e.target.value })}
                      placeholder="URL"
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => deleteLink(editingColumn.id, index)}
                  >
                    <Trash2 size={12} className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Copyright */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Copyright</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">English</Label>
            <Input
              value={config.copyrightEn}
              onChange={(e) => update({ copyrightEn: e.target.value })}
              placeholder="© 2024 Shop"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.copyrightKh}
              onChange={(e) => update({ copyrightKh: e.target.value })}
              placeholder="© 2024 Shop"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Social Links */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Social Links</Label>
          <Switch
            checked={config.showSocialIcons}
            onCheckedChange={(v) => update({ showSocialIcons: v })}
          />
        </div>

        {config.showSocialIcons && (
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Facebook</Label>
              <Input
                value={config.socialLinks.facebook || ""}
                onChange={(e) => update({ socialLinks: { ...config.socialLinks, facebook: e.target.value } })}
                placeholder="https://facebook.com/yourpage"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Instagram</Label>
              <Input
                value={config.socialLinks.instagram || ""}
                onChange={(e) => update({ socialLinks: { ...config.socialLinks, instagram: e.target.value } })}
                placeholder="https://instagram.com/yourpage"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Telegram</Label>
              <Input
                value={config.socialLinks.telegram || ""}
                onChange={(e) => update({ socialLinks: { ...config.socialLinks, telegram: e.target.value } })}
                placeholder="https://t.me/yourchannel"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
