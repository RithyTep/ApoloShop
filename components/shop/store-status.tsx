"use client"

import { Clock } from "lucide-react"
import { useStoreStatus } from "@/lib/api-hooks"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface StoreStatusProps {
  language: "EN" | "KH"
}

export function StoreStatus({ language }: StoreStatusProps) {
  const { data: status, isLoading } = useStoreStatus()

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
      displayText = language === "EN" ? "Closed" : "បិទ"
      tooltipText = language === "EN"
        ? `Closed for ${status.holiday.nameEn}`
        : `បិទសម្រាប់${status.holiday.nameKh}`
    } else {
      // Special holiday hours
      displayText = isOpen
        ? (language === "EN" ? "Open" : "បើក")
        : (language === "EN" ? "Closed" : "បិទ")
      tooltipText = language === "EN"
        ? `${status.holiday.nameEn}: ${status.holiday.openTime} - ${status.holiday.closeTime}`
        : `${status.holiday.nameKh}: ${status.holiday.openTime} - ${status.holiday.closeTime}`
    }
  } else if (status.hours) {
    // Regular hours
    displayText = isOpen
      ? (language === "EN" ? "Open" : "បើក")
      : (language === "EN" ? "Closed" : "បិទ")

    if (status.hours.isOpen && status.hours.openTime && status.hours.closeTime) {
      tooltipText = language === "EN"
        ? `Hours: ${status.hours.openTime} - ${status.hours.closeTime}`
        : `ម៉ោងបើក: ${status.hours.openTime} - ${status.hours.closeTime}`
    } else {
      tooltipText = language === "EN" ? "Closed today" : "បិទថ្ងៃនេះ"
    }
  } else {
    displayText = isOpen
      ? (language === "EN" ? "Open" : "បើក")
      : (language === "EN" ? "Closed" : "បិទ")
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
