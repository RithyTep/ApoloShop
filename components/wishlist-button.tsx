"use client"

import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useWishlist } from "@/lib/use-wishlist"

interface WishlistButtonProps {
  productId: string
  className?: string
  variant?: "icon" | "button"
  size?: "sm" | "md" | "lg"
  language?: "EN" | "KH"
}

export function WishlistButton({
  productId,
  className,
  variant = "icon",
  size = "md",
  language = "EN",
}: WishlistButtonProps) {
  const { isInWishlist, toggleWishlist } = useWishlist()
  const isWishlisted = isInWishlist(productId)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(productId)
  }

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  }

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  }

  if (variant === "button") {
    return (
      <Button
        variant={isWishlisted ? "default" : "outline"}
        size="sm"
        onClick={handleClick}
        className={cn(
          "gap-2 transition-all duration-200",
          isWishlisted && "bg-red-500 hover:bg-red-600 text-white border-red-500",
          className
        )}
      >
        <Heart
          size={iconSizes[size]}
          className={cn(
            "transition-all duration-200",
            isWishlisted && "fill-current"
          )}
        />
        <span>
          {isWishlisted
            ? language === "EN"
              ? "Saved"
              : "បានរក្សាទុក"
            : language === "EN"
              ? "Save"
              : "រក្សាទុក"}
        </span>
      </Button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center justify-center rounded-full transition-all duration-200",
        "bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm",
        "hover:scale-110 active:scale-95",
        sizeClasses[size],
        className
      )}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart
        size={iconSizes[size]}
        className={cn(
          "transition-all duration-200",
          isWishlisted
            ? "fill-red-500 text-red-500"
            : "text-gray-600 hover:text-red-500"
        )}
      />
    </button>
  )
}
