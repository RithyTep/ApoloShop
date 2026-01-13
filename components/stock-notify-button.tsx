"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bell, BellOff, Check, Loader2 } from "lucide-react"
import { translations } from "@/lib/i18n"

interface StockNotifyButtonProps {
  productId: string
  language?: "EN" | "KH"
  className?: string
  defaultEmail?: string
}

export function StockNotifyButton({
  productId,
  language = "EN",
  className = "",
  defaultEmail = "",
}: StockNotifyButtonProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const t = translations[language === "EN" ? "en" : "kh"].stockNotifications

  const handleSubscribe = async () => {
    if (!email) {
      setError(t.invalidEmail)
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(t.invalidEmail)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/stock-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === "Product is currently in stock") {
          setError(t.inStock)
        } else {
          setError(t.error)
        }
        return
      }

      if (data.alreadySubscribed) {
        setMessage(t.alreadySubscribed)
      } else {
        setMessage(t.success)
      }

      setIsSubscribed(true)
      setShowForm(false)
      // Store subscription in localStorage for UI state persistence
      const subscriptions = JSON.parse(localStorage.getItem("stockNotifications") || "[]")
      if (!subscriptions.includes(`${productId}:${email}`)) {
        subscriptions.push(`${productId}:${email}`)
        localStorage.setItem("stockNotifications", JSON.stringify(subscriptions))
      }
    } catch {
      setError(t.error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnsubscribe = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/stock-notifications?productId=${productId}&email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        setError(t.error)
        return
      }

      setIsSubscribed(false)
      setMessage(t.unsubscribeSuccess)
      setShowForm(false)

      // Remove from localStorage
      const subscriptions = JSON.parse(localStorage.getItem("stockNotifications") || "[]")
      const updated = subscriptions.filter((s: string) => s !== `${productId}:${email}`)
      localStorage.setItem("stockNotifications", JSON.stringify(updated))
    } catch {
      setError(t.error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // If already subscribed, show subscribed state
  if (isSubscribed) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2 text-success">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">{t.subscribed}</span>
        </div>
        {message && (
          <p className="text-xs text-muted-foreground">{message}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsSubscribed(false)
            setShowForm(true)
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <BellOff className="h-3 w-3 mr-1" />
          {t.unsubscribe}
        </Button>
      </div>
    )
  }

  // Show form for email entry
  if (showForm) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{t.enterEmail}</span>
        </div>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            className="flex-1"
            disabled={isSubmitting}
          />
          <Button
            onClick={handleSubscribe}
            disabled={isSubmitting || !email}
            size="sm"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t.subscribe
            )}
          </Button>
        </div>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(false)}
          className="text-xs"
        >
          {translations[language === "EN" ? "en" : "kh"].common?.cancel || "Cancel"}
        </Button>
      </div>
    )
  }

  // Default: Show notify button
  return (
    <div className={className}>
      <Button
        variant="outline"
        onClick={() => setShowForm(true)}
        className="w-full border-primary text-primary hover:bg-primary/5"
      >
        <Bell className="h-4 w-4 mr-2" />
        {t.notifyMe}
      </Button>
      {message && (
        <p className="text-xs text-muted-foreground mt-2">{message}</p>
      )}
    </div>
  )
}
