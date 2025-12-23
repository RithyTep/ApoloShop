"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { PromotionsConfig, PromotionCard } from "@/lib/api-hooks"

interface PromotionsEditorProps {
  config: PromotionsConfig
  onChange: (config: PromotionsConfig) => void
}

export function PromotionsEditor({ config, onChange }: PromotionsEditorProps) {
  const [editingCardId, setEditingCardId] = useState<string | null>(null)

  const update = (updates: Partial<PromotionsConfig>) => {
    onChange({ ...config, ...updates })
  }

  const addCard = () => {
    const newCard: PromotionCard = {
      id: `card-${Date.now()}`,
      imageUrl: "",
      titleEn: "New Promotion",
      titleKh: "ការផ្តល់ជូនថ្មី",
      descriptionEn: "",
      descriptionKh: "",
      link: "#",
    }
    update({ cards: [...config.cards, newCard] })
    setEditingCardId(newCard.id)
  }

  const updateCard = (cardId: string, updates: Partial<PromotionCard>) => {
    const newCards = config.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c))
    update({ cards: newCards })
  }

  const deleteCard = (cardId: string) => {
    update({ cards: config.cards.filter((c) => c.id !== cardId) })
    if (editingCardId === cardId) setEditingCardId(null)
  }

  const editingCard = config.cards.find((c) => c.id === editingCardId)

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
              placeholder="Special Offers"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.titleKh}
              onChange={(e) => update({ titleKh: e.target.value })}
              placeholder="ការផ្តល់ជូនពិសេស"
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
      </div>

      <Separator />

      {/* Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Promotion Cards</Label>
          <Button size="sm" variant="outline" onClick={addCard}>
            <Plus size={14} className="mr-1" />
            Add Card
          </Button>
        </div>

        <div className="space-y-2">
          {config.cards.map((card) => (
            <div
              key={card.id}
              className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                editingCardId === card.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => setEditingCardId(card.id)}
            >
              <GripVertical size={14} className="text-muted-foreground" />
              {card.imageUrl ? (
                <img src={card.imageUrl} alt="" className="w-10 h-10 object-cover rounded" />
              ) : (
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                  No img
                </div>
              )}
              <span className="flex-1 text-sm truncate">{card.titleEn}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteCard(card.id)
                }}
              >
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {config.cards.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No cards yet. Click "Add Card" to create one.
          </p>
        )}
      </div>

      {/* Card Editor */}
      {editingCard && (
        <>
          <Separator />
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium">Editing: {editingCard.titleEn}</Label>

            <div>
              <Label className="text-xs text-muted-foreground">Image URL</Label>
              <Input
                value={editingCard.imageUrl}
                onChange={(e) => updateCard(editingCard.id, { imageUrl: e.target.value })}
                placeholder="https://example.com/promo.jpg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Title (EN)</Label>
                <Input
                  value={editingCard.titleEn}
                  onChange={(e) => updateCard(editingCard.id, { titleEn: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Title (KH)</Label>
                <Input
                  value={editingCard.titleKh}
                  onChange={(e) => updateCard(editingCard.id, { titleKh: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Description (EN)</Label>
                <Input
                  value={editingCard.descriptionEn}
                  onChange={(e) => updateCard(editingCard.id, { descriptionEn: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description (KH)</Label>
                <Input
                  value={editingCard.descriptionKh}
                  onChange={(e) => updateCard(editingCard.id, { descriptionKh: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Link URL</Label>
                <Input
                  value={editingCard.link}
                  onChange={(e) => updateCard(editingCard.id, { link: e.target.value })}
                  placeholder="#"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Badge (optional)</Label>
                <Input
                  value={editingCard.badge || ""}
                  onChange={(e) => updateCard(editingCard.id, { badge: e.target.value })}
                  placeholder="20% OFF"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
