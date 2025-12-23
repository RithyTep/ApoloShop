"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PromotionsConfig } from "@/lib/api-hooks"

interface PromotionsRendererProps {
  config: PromotionsConfig
  language: "EN" | "KH"
  isPreview?: boolean
}

export function PromotionsRenderer({ config, language, isPreview }: PromotionsRendererProps) {
  const title = language === "EN" ? config.titleEn : config.titleKh

  if (config.cards.length === 0) {
    return (
      <section className="py-12 px-4 md:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">{title}</h2>
          <p className="text-muted-foreground">No promotion cards configured</p>
        </div>
      </section>
    )
  }

  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }

  return (
    <section className="py-12 px-4 md:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            {title}
          </h2>
        )}

        <div className={cn("grid gap-4 md:gap-6", gridCols[config.columns])}>
          {config.cards.map((card) => (
            <a
              key={card.id}
              href={isPreview ? undefined : card.link}
              className="group block bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              <div className="aspect-[16/9] bg-muted overflow-hidden relative">
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={language === "EN" ? card.titleEn : card.titleKh}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No image
                  </div>
                )}
                {card.badge && (
                  <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
                    {card.badge}
                  </Badge>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-foreground mb-1">
                  {language === "EN" ? card.titleEn : card.titleKh}
                </h3>
                {(card.descriptionEn || card.descriptionKh) && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {language === "EN" ? card.descriptionEn : card.descriptionKh}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
