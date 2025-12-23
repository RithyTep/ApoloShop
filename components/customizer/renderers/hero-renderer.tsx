"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HeroConfig } from "@/lib/api-hooks"

interface HeroRendererProps {
  config: HeroConfig
  language: "EN" | "KH"
  isPreview?: boolean
}

const heightClasses = {
  small: "h-[300px]",
  medium: "h-[400px]",
  large: "h-[500px]",
  full: "h-screen",
}

export function HeroRenderer({ config, language, isPreview }: HeroRendererProps) {
  const title = language === "EN" ? config.titleEn : config.titleKh
  const subtitle = language === "EN" ? config.subtitleEn : config.subtitleKh
  const ctaText = language === "EN" ? config.ctaTextEn : config.ctaTextKh

  return (
    <section
      className={cn(
        "relative w-full overflow-hidden",
        heightClasses[config.height]
      )}
    >
      {/* Background Media */}
      {config.mediaUrl ? (
        config.mediaType === "video" ? (
          <video
            src={config.mediaUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <img
            src={config.mediaUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40" />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: config.overlayColor,
          opacity: config.overlayOpacity / 100,
        }}
      />

      {/* Content */}
      <div
        className={cn(
          "relative z-10 h-full flex flex-col justify-center px-6 md:px-12 max-w-7xl mx-auto",
          config.textAlignment === "center" && "items-center text-center",
          config.textAlignment === "right" && "items-end text-right"
        )}
      >
        {title && (
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-base md:text-lg lg:text-xl text-white/90 mb-8 max-w-2xl">
            {subtitle}
          </p>
        )}
        {ctaText && (
          <Button
            variant={config.ctaStyle === "outline" ? "outline" : config.ctaStyle === "ghost" ? "ghost" : "default"}
            size="lg"
            className={cn(
              config.ctaStyle === "primary" && "bg-white text-black hover:bg-white/90",
              config.ctaStyle === "outline" && "border-white text-white hover:bg-white/10",
              config.ctaStyle === "ghost" && "text-white hover:bg-white/10"
            )}
            onClick={() => !isPreview && config.ctaLink && (window.location.href = config.ctaLink)}
          >
            {ctaText}
          </Button>
        )}
      </div>
    </section>
  )
}
