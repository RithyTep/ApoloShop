"use client"

import { useState, useEffect } from "react"
import { X, ArrowRight } from "lucide-react"
import { AnnouncementConfig } from "@/lib/api-hooks"
import { type Language } from "@/lib/i18n"

interface AnnouncementBannerProps {
  config: AnnouncementConfig
  language: Language
  currentPage?: "home" | "checkout" | "other"
}

const STORAGE_KEY = "announcement-dismissed"

export function AnnouncementBanner({ config, language, currentPage = "other" }: AnnouncementBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check localStorage for dismissal
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) {
      const dismissedData = JSON.parse(dismissed)
      // Only consider dismissed if the text matches (so new announcements show)
      if (dismissedData.textEn === config.textEn) {
        setIsDismissed(true)
        return
      }
    }
    setIsVisible(true)
  }, [config.textEn])

  // Check if banner should be shown
  if (!config.enabled || isDismissed || !isVisible) {
    return null
  }

  // Check schedule
  if (config.startDate) {
    const now = new Date()
    const startDate = new Date(config.startDate)
    if (now < startDate) return null
  }

  if (config.endDate) {
    const now = new Date()
    const endDate = new Date(config.endDate)
    endDate.setHours(23, 59, 59, 999) // End of day
    if (now > endDate) return null
  }

  // Check page visibility
  if (config.showOnPages === "home" && currentPage !== "home") {
    return null
  }
  if (config.showOnPages === "checkout" && currentPage !== "checkout") {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        textEn: config.textEn,
        dismissedAt: new Date().toISOString(),
      })
    )
  }

  // Announcement only supports EN/KH, other languages fall back to EN
  const isKhmer = language === "kh"
  const text = isKhmer ? config.textKh : config.textEn
  const linkText = isKhmer ? config.linkTextKh : config.linkTextEn

  return (
    <div
      className="relative py-2.5 px-4 text-center text-sm font-medium"
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <span>{text}</span>
        {config.linkUrl && linkText && (
          <a
            href={config.linkUrl}
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 transition-opacity"
            style={{ color: config.textColor }}
          >
            {linkText}
            <ArrowRight size={14} />
          </a>
        )}
      </div>

      {config.isDismissible && (
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity"
          style={{ color: config.textColor }}
          aria-label="Dismiss announcement"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
