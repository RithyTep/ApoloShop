"use client"

import { useLanguage } from "@/lib/shop-context"
import { HeroRenderer } from "@/components/customizer/renderers/hero-renderer"
import type { HeroConfig } from "@/lib/api-hooks"

interface HeroSectionProps {
  config: HeroConfig
}

export function HeroSection({ config }: HeroSectionProps) {
  const { language } = useLanguage()
  return <HeroRenderer config={config} language={language} />
}
