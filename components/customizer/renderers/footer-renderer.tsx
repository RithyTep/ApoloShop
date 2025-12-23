"use client"

import { Facebook, Instagram, Send } from "lucide-react"
import { FooterConfig } from "@/lib/api-hooks"

interface FooterRendererProps {
  config: FooterConfig
  language: "EN" | "KH"
  isPreview?: boolean
}

export function FooterRenderer({ config, language, isPreview }: FooterRendererProps) {
  const copyright = language === "EN" ? config.copyrightEn : config.copyrightKh

  return (
    <footer
      className="py-12 px-4 md:px-8"
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Columns */}
        {config.columns.length > 0 && (
          <div
            className="grid gap-8 mb-8"
            style={{
              gridTemplateColumns: `repeat(${Math.min(config.columns.length, 4)}, minmax(0, 1fr))`,
            }}
          >
            {config.columns.map((column) => (
              <div key={column.id}>
                <h3 className="font-semibold mb-4">
                  {language === "EN" ? column.titleEn : column.titleKh}
                </h3>
                {column.type === "links" && column.links && (
                  <ul className="space-y-2">
                    {column.links.map((link, index) => (
                      <li key={index}>
                        <a
                          href={isPreview ? undefined : link.url}
                          className="text-sm opacity-80 hover:opacity-100 transition-opacity"
                        >
                          {language === "EN" ? link.textEn : link.textKh}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {column.type === "text" && column.content && (
                  <p className="text-sm opacity-80">
                    {language === "EN" ? column.content.en : column.content.kh}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bottom Section */}
        <div className="border-t border-current/20 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-sm opacity-70">{copyright}</p>

          {/* Social Links */}
          {config.showSocialIcons && (
            <div className="flex items-center gap-4">
              {config.socialLinks.facebook && (
                <a
                  href={isPreview ? undefined : config.socialLinks.facebook}
                  className="opacity-70 hover:opacity-100 transition-opacity"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook size={20} />
                </a>
              )}
              {config.socialLinks.instagram && (
                <a
                  href={isPreview ? undefined : config.socialLinks.instagram}
                  className="opacity-70 hover:opacity-100 transition-opacity"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram size={20} />
                </a>
              )}
              {config.socialLinks.telegram && (
                <a
                  href={isPreview ? undefined : config.socialLinks.telegram}
                  className="opacity-70 hover:opacity-100 transition-opacity"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Send size={20} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
