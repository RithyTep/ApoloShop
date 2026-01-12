"use client"

import { Zap, Shield, Truck, Clock, Heart, Star, Gift, Award, Sparkles, ThumbsUp, Check, Headphones, CreditCard, RotateCcw, Package } from "lucide-react"
import { FeaturesConfig } from "@/lib/api-hooks"

interface FeaturesRendererProps {
  config: FeaturesConfig
  language: "EN" | "KH"
}

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  zap: Zap,
  shield: Shield,
  truck: Truck,
  clock: Clock,
  heart: Heart,
  star: Star,
  gift: Gift,
  award: Award,
  sparkles: Sparkles,
  thumbsUp: ThumbsUp,
  check: Check,
  headphones: Headphones,
  creditCard: CreditCard,
  rotateCcw: RotateCcw,
  package: Package,
}

export function FeaturesRenderer({ config, language }: FeaturesRendererProps) {
  const title = language === "EN" ? config.titleEn : config.titleKh
  const subtitle = language === "EN" ? config.subtitleEn : config.subtitleKh

  if (config.features.length === 0) {
    return null
  }

  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  }

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          {title && (
            <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
          )}
          {subtitle && (
            <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>

        {/* Grid Layout */}
        {config.layout === "grid" && (
          <div className={`grid grid-cols-1 ${gridCols[config.columns]} gap-8`}>
            {config.features.map((feature) => {
              const IconComponent = iconMap[feature.icon] || Zap
              return (
                <div key={feature.id} className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <IconComponent size={28} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {language === "EN" ? feature.titleEn : feature.titleKh}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "EN" ? feature.descriptionEn : feature.descriptionKh}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* List Layout */}
        {config.layout === "list" && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {config.features.map((feature) => {
              const IconComponent = iconMap[feature.icon] || Zap
              return (
                <div key={feature.id} className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <IconComponent size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {language === "EN" ? feature.titleEn : feature.titleKh}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {language === "EN" ? feature.descriptionEn : feature.descriptionKh}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
