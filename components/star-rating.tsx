"use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: "sm" | "md" | "lg"
  showValue?: boolean
  showCount?: boolean
  totalReviews?: number
  interactive?: boolean
  onChange?: (rating: number) => void
  className?: string
}

const sizeClasses = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
}

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  showValue = false,
  showCount = false,
  totalReviews = 0,
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  const roundedRating = Math.round(rating * 2) / 2 // Round to nearest 0.5

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (interactive && onChange && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault()
      onChange(index + 1)
    }
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }).map((_, index) => {
          const fillPercentage = Math.min(Math.max(roundedRating - index, 0), 1) * 100

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleClick(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              disabled={!interactive}
              className={cn(
                "relative focus:outline-none",
                interactive && "cursor-pointer hover:scale-110 transition-transform",
                !interactive && "cursor-default"
              )}
              aria-label={`${index + 1} star${index === 0 ? "" : "s"}`}
              tabIndex={interactive ? 0 : -1}
            >
              {/* Background star (empty) */}
              <Star
                className={cn(sizeClasses[size], "text-muted-foreground/30")}
                fill="currentColor"
              />
              {/* Foreground star (filled) - clipped based on rating */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercentage}%` }}
              >
                <Star
                  className={cn(sizeClasses[size], "text-yellow-400")}
                  fill="currentColor"
                />
              </div>
            </button>
          )
        })}
      </div>

      {showValue && rating > 0 && (
        <span className={cn(textSizeClasses[size], "font-medium text-foreground ml-1")}>
          {rating.toFixed(1)}
        </span>
      )}

      {showCount && totalReviews > 0 && (
        <span className={cn(textSizeClasses[size], "text-muted-foreground")}>
          ({totalReviews})
        </span>
      )}
    </div>
  )
}

interface InteractiveStarRatingProps {
  value: number
  onChange: (value: number) => void
  size?: "sm" | "md" | "lg"
  className?: string
}

export function InteractiveStarRating({
  value,
  onChange,
  size = "lg",
  className,
}: InteractiveStarRatingProps) {
  return (
    <StarRating
      rating={value}
      size={size}
      interactive
      onChange={onChange}
      className={className}
    />
  )
}
