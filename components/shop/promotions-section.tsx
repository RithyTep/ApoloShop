"use client"

import { useLanguage } from "@/lib/shop-context"
import { PromotionsRenderer } from "@/components/customizer/renderers/promotions-renderer"
import type { PromotionsConfig } from "@/lib/api-hooks"

interface PromotionsSectionProps {
  config: PromotionsConfig
}

export function PromotionsSection({ config }: PromotionsSectionProps) {
  const { language } = useLanguage()
  return <PromotionsRenderer config={config} language={language} />
}
