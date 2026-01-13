"use client"

import { Globe, Check, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { SUPPORTED_LANGUAGES, type Language, getLanguageConfig, type LanguageConfig } from "@/lib/i18n"

interface LanguageSwitcherProps {
  currentLanguage: Language
  onLanguageChange: (lang: Language) => void
  variant?: "compact" | "full"
  showFlag?: boolean
  className?: string
}

export function LanguageSwitcher({
  currentLanguage,
  onLanguageChange,
  variant = "compact",
  showFlag = true,
  className,
}: LanguageSwitcherProps) {
  const currentConfig = getLanguageConfig(currentLanguage)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === "compact" ? "sm" : "default"}
          className={`flex items-center gap-1.5 ${className || ""}`}
          aria-label={`Language: ${currentConfig.nativeName}. Click to change language.`}
        >
          {showFlag && (
            <span className="text-base" aria-hidden="true">
              {currentConfig.flag}
            </span>
          )}
          {variant === "full" ? (
            <span className="hidden sm:inline">{currentConfig.nativeName}</span>
          ) : (
            <span className="text-xs font-medium">{currentConfig.code.toUpperCase()}</span>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Select Language
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map((lang) => {
          const config = getLanguageConfig(lang)
          const isActive = lang === currentLanguage
          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => onLanguageChange(lang)}
              className={`flex items-center justify-between cursor-pointer ${
                isActive ? "bg-accent" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base" aria-hidden="true">
                  {config.flag}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium">{config.nativeName}</span>
                  <span className="text-xs text-muted-foreground">{config.name}</span>
                </div>
              </div>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          RTL languages coming soon
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Simple pill toggle for backward compatibility (EN/KH only display)
interface LanguagePillToggleProps {
  currentLanguage: Language
  onLanguageChange: (lang: Language) => void
  languages?: Language[]
}

export function LanguagePillToggle({
  currentLanguage,
  onLanguageChange,
  languages = ["en", "kh"],
}: LanguagePillToggleProps) {
  return (
    <div
      className="flex items-center bg-muted rounded-full p-0.5"
      role="group"
      aria-label="Language selection"
    >
      {languages.map((lang) => {
        const config = getLanguageConfig(lang)
        const isActive = lang === currentLanguage
        return (
          <button
            key={lang}
            onClick={() => onLanguageChange(lang)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={isActive}
            aria-label={config.nativeName}
          >
            {config.code.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
