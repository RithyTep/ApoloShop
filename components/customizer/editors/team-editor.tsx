"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ImageUpload } from "@/components/ui/image-upload"
import { TeamConfig, TeamMember } from "@/lib/api-hooks"

interface TeamEditorProps {
  config: TeamConfig
  onChange: (config: TeamConfig) => void
}

export function TeamEditor({ config, onChange }: TeamEditorProps) {
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)

  const update = (updates: Partial<TeamConfig>) => {
    onChange({ ...config, ...updates })
  }

  const addMember = () => {
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: "New Member",
      roleEn: "Position",
      roleKh: "មុខតំណែង",
      imageUrl: "",
    }
    update({ members: [...config.members, newMember] })
    setEditingMemberId(newMember.id)
  }

  const updateMember = (memberId: string, updates: Partial<TeamMember>) => {
    const newMembers = config.members.map((m) => (m.id === memberId ? { ...m, ...updates } : m))
    update({ members: newMembers })
  }

  const deleteMember = (memberId: string) => {
    update({ members: config.members.filter((m) => m.id !== memberId) })
    if (editingMemberId === memberId) setEditingMemberId(null)
  }

  const editingMember = config.members.find((m) => m.id === editingMemberId)

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
              placeholder="Our Team"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Khmer</Label>
            <Input
              value={config.titleKh}
              onChange={(e) => update({ titleKh: e.target.value })}
              placeholder="ក្រុមការងាររបស់យើង"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Team Members List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Team Members</Label>
          <Button size="sm" variant="outline" onClick={addMember}>
            <Plus size={14} className="mr-1" />
            Add Member
          </Button>
        </div>

        <div className="space-y-2">
          {config.members.map((member) => (
            <div
              key={member.id}
              className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                editingMemberId === member.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => setEditingMemberId(member.id)}
            >
              <GripVertical size={14} className="text-muted-foreground" />
              {member.imageUrl ? (
                <img src={member.imageUrl} alt="" className="w-10 h-10 object-cover rounded-full" />
              ) : (
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <User size={18} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground truncate">{member.roleEn}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteMember(member.id)
                }}
              >
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {config.members.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No team members yet. Click "Add Member" to create one.
          </p>
        )}
      </div>

      {/* Member Editor */}
      {editingMember && (
        <>
          <Separator />
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium">Edit: {editingMember.name}</Label>

            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={editingMember.name}
                onChange={(e) => updateMember(editingMember.id, { name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Role (EN)</Label>
                <Input
                  value={editingMember.roleEn}
                  onChange={(e) => updateMember(editingMember.id, { roleEn: e.target.value })}
                  placeholder="Manager"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Role (KH)</Label>
                <Input
                  value={editingMember.roleKh}
                  onChange={(e) => updateMember(editingMember.id, { roleKh: e.target.value })}
                  placeholder="អ្នកគ្រប់គ្រង"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Photo</Label>
              <ImageUpload
                value={editingMember.imageUrl || ""}
                onChange={(url) => updateMember(editingMember.id, { imageUrl: url })}
                onRemove={() => updateMember(editingMember.id, { imageUrl: "" })}
                folder="team"
                aspectRatio="square"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
