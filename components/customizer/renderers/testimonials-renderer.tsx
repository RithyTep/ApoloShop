"use client"

import { User, Star, Quote } from "lucide-react"
import { TestimonialsConfig } from "@/lib/api-hooks"

interface TestimonialsRendererProps {
  config: TestimonialsConfig
  language: "EN" | "KH"
}

export function TestimonialsRenderer({ config, language }: TestimonialsRendererProps) {
  const title = language === "EN" ? config.titleEn : config.titleKh

  if (config.testimonials.length === 0) {
    return null
  }

  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
  }

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">{title}</h2>
        )}

        <div className={`grid grid-cols-1 ${gridCols[config.columns]} gap-6`}>
          {config.testimonials.map((item) => (
            <div
              key={item.id}
              className="bg-background p-6 rounded-lg shadow-sm border relative"
            >
              <Quote
                size={32}
                className="absolute top-4 right-4 text-primary/10"
              />

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={i < item.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}
                  />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{language === "EN" ? item.contentEn : item.contentKh}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <User size={24} className="text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === "EN" ? item.roleEn : item.roleKh}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
