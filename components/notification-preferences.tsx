"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Bell, Mail, MessageCircle, Check, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { translations, type Language } from "@/lib/i18n"

// Types matching the Prisma schema
type NotificationChannel = "TELEGRAM" | "EMAIL" | "SMS"

interface NotificationPreference {
  id: string
  customerId: string
  channel: NotificationChannel
  enabled: boolean
  telegramChatId?: string | null
  orderConfirmation: boolean
  orderPreparing: boolean
  orderReady: boolean
  orderCompleted: boolean
  orderCancelled: boolean
}

interface NotificationPreferencesProps {
  customerId: string
  customerEmail?: string | null
  language?: Language
  onUpdate?: () => void
}

const channelConfig: Record<NotificationChannel, { icon: typeof Bell; label: string; labelKh: string }> = {
  TELEGRAM: { icon: MessageCircle, label: "Telegram", labelKh: "តេឡេក្រាម" },
  EMAIL: { icon: Mail, label: "Email", labelKh: "អ៊ីមែល" },
  SMS: { icon: Bell, label: "SMS", labelKh: "សារ SMS" },
}

const statusConfig = [
  { key: "orderConfirmation", label: "Order Confirmed", labelKh: "បញ្ជាក់ការបញ្ជាទិញ" },
  { key: "orderPreparing", label: "Preparing", labelKh: "កំពុងរៀបចំ" },
  { key: "orderReady", label: "Ready", labelKh: "រួចរាល់" },
  { key: "orderCompleted", label: "Completed", labelKh: "បានបញ្ចប់" },
  { key: "orderCancelled", label: "Cancelled", labelKh: "បានលុបចោល" },
] as const

export function NotificationPreferences({
  customerId,
  customerEmail,
  language = "en",
  onUpdate,
}: NotificationPreferencesProps) {
  const { toast } = useToast()
  const t = translations[language]

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [editingTelegramId, setEditingTelegramId] = useState("")

  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences()
  }, [customerId])

  const fetchPreferences = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/notifications/preferences?customerId=${customerId}`)
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences || [])
        // Set initial telegram ID if exists
        const telegramPref = data.preferences?.find((p: NotificationPreference) => p.channel === "TELEGRAM")
        if (telegramPref?.telegramChatId) {
          setEditingTelegramId(telegramPref.telegramChatId)
        }
      }
    } catch (error) {
      console.error("Failed to fetch notification preferences:", error)
    } finally {
      setLoading(false)
    }
  }

  const getPreference = (channel: NotificationChannel): NotificationPreference | undefined => {
    return preferences.find((p) => p.channel === channel)
  }

  const updatePreference = async (
    channel: NotificationChannel,
    updates: Partial<NotificationPreference>
  ) => {
    setSaving(true)
    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          channel,
          ...updates,
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        setPreferences((prev) => {
          const existing = prev.findIndex((p) => p.channel === channel)
          if (existing >= 0) {
            const newPrefs = [...prev]
            newPrefs[existing] = updated
            return newPrefs
          }
          return [...prev, updated]
        })
        toast({
          title: language === "en" ? "Preferences saved" : "បានរក្សាទុកការកំណត់",
        })
        onUpdate?.()
      } else {
        throw new Error("Failed to update preference")
      }
    } catch (error) {
      toast({
        title: language === "en" ? "Error" : "កំហុស",
        description: language === "en" ? "Failed to save preferences" : "បរាជ័យក្នុងការរក្សាទុក",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleChannel = async (channel: NotificationChannel) => {
    const current = getPreference(channel)
    await updatePreference(channel, { enabled: !current?.enabled })
  }

  const toggleStatus = async (channel: NotificationChannel, statusKey: string) => {
    const current = getPreference(channel)
    await updatePreference(channel, {
      [statusKey]: !current?.[statusKey as keyof NotificationPreference],
    })
  }

  const saveTelegramId = async () => {
    await updatePreference("TELEGRAM", {
      telegramChatId: editingTelegramId || undefined,
      enabled: !!editingTelegramId,
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">
          {language === "en" ? "Notification Preferences" : "ការកំណត់ការជូនដំណឹង"}
        </h3>
      </div>

      {/* Telegram Channel */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Telegram</span>
          </div>
          <Switch
            checked={getPreference("TELEGRAM")?.enabled ?? false}
            onCheckedChange={() => toggleChannel("TELEGRAM")}
            disabled={saving || !editingTelegramId}
          />
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={language === "en" ? "Telegram Chat ID" : "លេខ Chat ID Telegram"}
              value={editingTelegramId}
              onChange={(e) => setEditingTelegramId(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={saveTelegramId}
              disabled={saving}
            >
              {saving ? "..." : <Check className="h-4 w-4" />}
            </Button>
          </div>

          {getPreference("TELEGRAM")?.enabled && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {statusConfig.map(({ key, label, labelKh }) => {
                const pref = getPreference("TELEGRAM")
                const isEnabled = pref?.[key as keyof NotificationPreference] ?? true
                return (
                  <Badge
                    key={key}
                    variant={isEnabled ? "default" : "outline"}
                    className={`cursor-pointer ${isEnabled ? "" : "opacity-50"}`}
                    onClick={() => toggleStatus("TELEGRAM", key)}
                  >
                    {language === "en" ? label : labelKh}
                  </Badge>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Email Channel */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-amber-500" />
            <span className="font-medium">Email</span>
          </div>
          <Switch
            checked={getPreference("EMAIL")?.enabled ?? false}
            onCheckedChange={() => toggleChannel("EMAIL")}
            disabled={saving || !customerEmail}
          />
        </div>

        {!customerEmail ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            {language === "en"
              ? "No email address on file"
              : "មិនមានអាសយដ្ឋានអ៊ីមែល"}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground mb-2">{customerEmail}</div>
        )}

        {getPreference("EMAIL")?.enabled && customerEmail && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {statusConfig.map(({ key, label, labelKh }) => {
              const pref = getPreference("EMAIL")
              const isEnabled = pref?.[key as keyof NotificationPreference] ?? true
              return (
                <Badge
                  key={key}
                  variant={isEnabled ? "default" : "outline"}
                  className={`cursor-pointer ${isEnabled ? "" : "opacity-50"}`}
                  onClick={() => toggleStatus("EMAIL", key)}
                >
                  {language === "en" ? label : labelKh}
                </Badge>
              )
            })}
          </div>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        {language === "en"
          ? "Click on status badges to toggle notifications for specific order statuses."
          : "ចុចលើ badge ដើម្បីបើក/បិទការជូនដំណឹងសម្រាប់ស្ថានភាពនីមួយៗ។"}
      </p>
    </div>
  )
}
