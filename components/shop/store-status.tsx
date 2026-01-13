"use client"

import { Clock } from "lucide-react"
import { useStoreStatus } from "@/lib/api-hooks"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type Language } from "@/lib/i18n"

interface StoreStatusProps {
  language: Language
}

export function StoreStatus({ language }: StoreStatusProps) {
  const { data: status, isLoading } = useStoreStatus()
  // Use Khmer for "kh", English for all other languages (including th, vi, zh)
  const isKhmer = language === "kh"

  if (isLoading || !status) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted animate-pulse">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        <span className="text-xs text-muted-foreground">...</span>
      </div>
    )
  }

  const isOpen = status.isOpen
  const isHoliday = status.reason === "holiday" || status.reason === "holiday_hours"

  // Determine display text
  let displayText = ""
  let tooltipText = ""

  if (isHoliday && status.holiday) {
    if (status.reason === "holiday") {
      // Full day closure
      displayText = isKhmer ? "បិទ" : "Closed"
      tooltipText = isKhmer
        ? `បិទសម្រាប់${status.holiday.nameKh}`
        : `Closed for ${status.holiday.nameEn}`
    } else {
      // Special holiday hours
      displayText = isOpen
        ? (isKhmer ? "បើក" : "Open")
        : (isKhmer ? "បិទ" : "Closed")
      tooltipText = isKhmer
        ? `${status.holiday.nameKh}: ${status.holiday.openTime} - ${status.holiday.closeTime}`
        : `${status.holiday.nameEn}: ${status.holiday.openTime} - ${status.holiday.closeTime}`
    }
  } else if (status.hours) {
    // Regular hours
    displayText = isOpen
      ? (isKhmer ? "បើក" : "Open")
      : (isKhmer ? "បិទ" : "Closed")

    if (status.hours.isOpen && status.hours.openTime && status.hours.closeTime) {
      tooltipText = isKhmer
        ? `ម៉ោងបើក: ${status.hours.openTime} - ${status.hours.closeTime}`
        : `Hours: ${status.hours.openTime} - ${status.hours.closeTime}`
    } else {
      tooltipText = isKhmer ? "បិទថ្ងៃនេះ" : "Closed today"
    }
  } else {
    displayText = isOpen
      ? (isKhmer ? "បើក" : "Open")
      : (isKhmer ? "បិទ" : "Closed")
    tooltipText = ""
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-default transition-colors ${
              isOpen
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOpen ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="text-xs font-medium">{displayText}</span>
            {isHoliday && (
              <Clock className="w-3 h-3 opacity-70" />
            )}
          </div>
        </TooltipTrigger>
        {tooltipText && (
          <TooltipContent side="bottom" className="text-xs">
            {tooltipText}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
