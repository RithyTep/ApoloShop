"use client"

import { useLanguage } from "@/lib/shop-context"
import { FooterRenderer } from "@/components/customizer/renderers/footer-renderer"
import type { FooterConfig } from "@/lib/api-hooks"

interface FooterSectionProps {
  config: FooterConfig
}

export function FooterSection({ config }: FooterSectionProps) {
  const { language } = useLanguage()
  return <FooterRenderer config={config} language={language} />
}
