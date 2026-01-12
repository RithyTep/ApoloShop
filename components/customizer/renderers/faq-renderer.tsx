"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { FAQConfig } from "@/lib/api-hooks"
import { cn } from "@/lib/utils"

interface FAQRendererProps {
  config: FAQConfig
  language: "EN" | "KH"
}

export function FAQRenderer({ config, language }: FAQRendererProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const title = language === "EN" ? config.titleEn : config.titleKh
  const subtitle = language === "EN" ? config.subtitleEn : config.subtitleKh

  if (config.items.length === 0) {
    return null
  }

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          {title && (
            <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
          )}
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          {config.items.map((item) => {
            const isOpen = openItems.has(item.id)
            const question = language === "EN" ? item.questionEn : item.questionKh
            const answer = language === "EN" ? item.answerEn : item.answerKh

            return (
              <div
                key={item.id}
                className="bg-background rounded-lg border overflow-hidden"
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-foreground pr-4">{question}</span>
                  <ChevronDown
                    size={20}
                    className={cn(
                      "text-muted-foreground shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    isOpen ? "max-h-96" : "max-h-0"
                  )}
                >
                  <div className="p-4 pt-0 text-muted-foreground">
                    {answer}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
