"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical, HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { FAQConfig, FAQItem } from "@/lib/api-hooks"

interface FAQEditorProps {
  config: FAQConfig
  onChange: (config: FAQConfig) => void
}

export function FAQEditor({ config, onChange }: FAQEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const update = (updates: Partial<FAQConfig>) => {
    onChange({ ...config, ...updates })
  }

  const addItem = () => {
    const newItem: FAQItem = {
      id: `faq-${Date.now()}`,
      questionEn: "New Question?",
      questionKh: "សំណួរថ្មី?",
      answerEn: "Answer goes here...",
      answerKh: "ចម្លើយនៅទីនេះ...",
    }
    update({ items: [...config.items, newItem] })
    setEditingId(newItem.id)
  }

  const updateItem = (id: string, updates: Partial<FAQItem>) => {
    const newItems = config.items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    update({ items: newItems })
  }

  const deleteItem = (id: string) => {
    update({ items: config.items.filter((item) => item.id !== id) })
    if (editingId === id) setEditingId(null)
  }

  const editingItem = config.items.find((item) => item.id === editingId)

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
              placeholder="Frequently Asked Questions"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.titleKh}
              onChange={(e) => update({ titleKh: e.target.value })}
              placeholder="សំណួរដែលសួរញឹកញាប់"
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
              placeholder="Find answers to common questions"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.subtitleKh}
              onChange={(e) => update({ subtitleKh: e.target.value })}
              placeholder="ស្វែងរកចម្លើយសំណួរទូទៅ"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* FAQ Items List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Questions</Label>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus size={14} className="mr-1" />
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {config.items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                editingId === item.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => setEditingId(item.id)}
            >
              <GripVertical size={14} className="text-muted-foreground" />
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <HelpCircle size={18} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.questionEn}</p>
                <p className="text-xs text-muted-foreground truncate">{item.answerEn}</p>
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

        {config.items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No FAQ items yet. Click "Add" to create one.
          </p>
        )}
      </div>

      {/* Item Editor */}
      {editingItem && (
        <>
          <Separator />
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium">Edit Question</Label>

            <div>
              <Label className="text-xs text-muted-foreground">Question (EN)</Label>
              <Input
                value={editingItem.questionEn}
                onChange={(e) => updateItem(editingItem.id, { questionEn: e.target.value })}
                placeholder="What is your return policy?"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Question (KH)</Label>
              <Input
                value={editingItem.questionKh}
                onChange={(e) => updateItem(editingItem.id, { questionKh: e.target.value })}
                placeholder="គោលការណ៍ប្រគល់វិញរបស់អ្នកគឺជាអ្វី?"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Answer (EN)</Label>
              <Textarea
                value={editingItem.answerEn}
                onChange={(e) => updateItem(editingItem.id, { answerEn: e.target.value })}
                placeholder="Provide a detailed answer..."
                rows={3}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Answer (KH)</Label>
              <Textarea
                value={editingItem.answerKh}
                onChange={(e) => updateItem(editingItem.id, { answerKh: e.target.value })}
                placeholder="ផ្តល់ចម្លើយលម្អិត..."
                rows={3}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
