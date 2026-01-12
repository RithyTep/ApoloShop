"use client"

import { useMemo } from "react"
import { Check, X, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  calculatePasswordStrength,
  passwordRequirements,
  type PasswordStrengthLevel,
} from "@/lib/password-security"

interface PasswordStrengthIndicatorProps {
  password: string
  language?: "EN" | "KH"
  showRequirements?: boolean
  className?: string
}

const strengthColors: Record<PasswordStrengthLevel, string> = {
  weak: "bg-red-500",
  fair: "bg-orange-500",
  good: "bg-yellow-500",
  strong: "bg-green-500",
}

const strengthTextColors: Record<PasswordStrengthLevel, string> = {
  weak: "text-red-500",
  fair: "text-orange-500",
  good: "text-yellow-500",
  strong: "text-green-500",
}

const strengthBarWidths: Record<PasswordStrengthLevel, string> = {
  weak: "w-1/4",
  fair: "w-2/4",
  good: "w-3/4",
  strong: "w-full",
}

export function PasswordStrengthIndicator({
  password,
  language = "EN",
  showRequirements = true,
  className,
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password])

  const requirementStatus = useMemo(
    () =>
      passwordRequirements.map((req) => ({
        ...req,
        met: req.test(password),
      })),
    [password]
  )

  const allRequirementsMet = requirementStatus.every((r) => r.met)

  if (!password) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              strengthColors[strength.level],
              strengthBarWidths[strength.level]
            )}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={cn("font-medium", strengthTextColors[strength.level])}>
            {language === "EN" ? strength.label : strength.labelKh}
          </span>
          <span className="text-muted-foreground">
            {language === "EN" ? "Password strength" : "កម្លាំងពាក្យសម្ងាត់"}
          </span>
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground mb-2">
            {language === "EN" ? "Password must contain:" : "ពាក្យសម្ងាត់ត្រូវមាន:"}
          </p>
          <ul className="space-y-1">
            {requirementStatus.map((req) => (
              <li
                key={req.id}
                className={cn(
                  "flex items-center gap-2 text-xs transition-colors duration-200",
                  req.met ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {req.met ? (
                  <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span>{language === "EN" ? req.label : req.labelKh}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success message */}
      {allRequirementsMet && strength.level === "strong" && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-md">
          <Check className="h-4 w-4" />
          <span>
            {language === "EN"
              ? "Excellent! Your password is secure."
              : "ល្អឥតខ្ចោះ! ពាក្យសម្ងាត់របស់អ្នកមានសុវត្ថិភាព។"}
          </span>
        </div>
      )}
    </div>
  )
}

// Compact version for inline use
interface PasswordStrengthBadgeProps {
  password: string
  language?: "EN" | "KH"
}

export function PasswordStrengthBadge({
  password,
  language = "EN",
}: PasswordStrengthBadgeProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password])

  if (!password) {
    return null
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded",
        strength.level === "weak" && "bg-red-100 text-red-800",
        strength.level === "fair" && "bg-orange-100 text-orange-800",
        strength.level === "good" && "bg-yellow-100 text-yellow-800",
        strength.level === "strong" && "bg-green-100 text-green-800"
      )}
    >
      {language === "EN" ? strength.label : strength.labelKh}
    </span>
  )
}

// Password expiry warning component
interface PasswordExpiryWarningProps {
  daysRemaining: number
  language?: "EN" | "KH"
  onChangePassword?: () => void
}

export function PasswordExpiryWarning({
  daysRemaining,
  language = "EN",
  onChangePassword,
}: PasswordExpiryWarningProps) {
  if (daysRemaining > 14) {
    return null
  }

  const isUrgent = daysRemaining <= 7
  const isExpired = daysRemaining <= 0

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border",
        isExpired
          ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
          : isUrgent
            ? "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800"
            : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800"
      )}
    >
      <AlertTriangle
        className={cn(
          "h-5 w-5 shrink-0 mt-0.5",
          isExpired
            ? "text-red-600"
            : isUrgent
              ? "text-orange-600"
              : "text-yellow-600"
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            isExpired
              ? "text-red-800 dark:text-red-200"
              : isUrgent
                ? "text-orange-800 dark:text-orange-200"
                : "text-yellow-800 dark:text-yellow-200"
          )}
        >
          {isExpired
            ? language === "EN"
              ? "Your password has expired"
              : "ពាក្យសម្ងាត់របស់អ្នកបានផុតកំណត់"
            : language === "EN"
              ? `Password expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`
              : `ពាក្យសម្ងាត់ផុតកំណត់ក្នុង ${daysRemaining} ថ្ងៃ`}
        </p>
        <p
          className={cn(
            "text-xs mt-1",
            isExpired
              ? "text-red-600 dark:text-red-300"
              : isUrgent
                ? "text-orange-600 dark:text-orange-300"
                : "text-yellow-600 dark:text-yellow-300"
          )}
        >
          {language === "EN"
            ? "Please update your password for security."
            : "សូមធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់របស់អ្នកដើម្បីសុវត្ថិភាព។"}
        </p>
        {onChangePassword && (
          <button
            onClick={onChangePassword}
            className={cn(
              "text-xs font-medium mt-2 hover:underline",
              isExpired
                ? "text-red-700 dark:text-red-300"
                : isUrgent
                  ? "text-orange-700 dark:text-orange-300"
                  : "text-yellow-700 dark:text-yellow-300"
            )}
          >
            {language === "EN" ? "Change password now" : "ប្តូរពាក្យសម្ងាត់ឥឡូវ"} &rarr;
          </button>
        )}
      </div>
    </div>
  )
}
