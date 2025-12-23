"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SettingsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Configure your shop settings</p>
      </div>

      {/* Shop Info */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Shop Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Shop Name</label>
            <Input defaultValue="My Awesome Coffee Shop" className="border-border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Address</label>
            <Input defaultValue="123 Main Street, Phnom Penh" className="border-border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
            <Input defaultValue="+855 10 123 456" className="border-border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Social Links</label>
            <Input placeholder="Facebook URL" className="border-border mb-2" />
            <Input placeholder="Telegram URL" className="border-border mb-2" />
            <Input placeholder="Instagram URL" className="border-border" />
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Save Changes</Button>
        </div>
      </Card>

      {/* Currency Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Currency Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Default Currency</label>
            <select className="w-full px-3 py-2 border border-border bg-background rounded">
              <option>USD</option>
              <option>KHR</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">USD to KHR Rate</label>
            <Input defaultValue="4100" className="border-border" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm text-foreground">Enable KHR</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm text-foreground">Enable USD</span>
          </label>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Save Changes</Button>
        </div>
      </Card>
    </div>
  )
}
