"use client"

import { AboutConfig } from "@/lib/api-hooks"

interface AboutRendererProps {
  config: AboutConfig
  language: "EN" | "KH"
}

export function AboutRenderer({ config, language }: AboutRendererProps) {
  const title = language === "EN" ? config.titleEn : config.titleKh
  const content = language === "EN" ? config.contentEn : config.contentKh

  const hasImage = !!config.imageUrl
  const isHorizontal = config.imagePosition === "left" || config.imagePosition === "right"

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">{title}</h2>
        )}

        <div
          className={`${
            hasImage && isHorizontal
              ? "grid md:grid-cols-2 gap-8 items-center"
              : "space-y-6"
          }`}
        >
          {/* Image - Top or Left position */}
          {hasImage && (config.imagePosition === "top" || config.imagePosition === "left") && (
            <div className={config.imagePosition === "top" ? "w-full" : ""}>
              <img
                src={config.imageUrl}
                alt={title}
                className={`rounded-lg object-cover ${
                  config.imagePosition === "top"
                    ? "w-full h-64 md:h-96"
                    : "w-full h-full max-h-96"
                }`}
              />
            </div>
          )}

          {/* Content */}
          <div
            className={`prose prose-sm md:prose-base max-w-none ${
              config.imagePosition === "right" ? "md:order-first" : ""
            }`}
          >
            {/* Render content as paragraphs - support simple markdown-style line breaks */}
            {content.split("\n\n").map((paragraph, index) => (
              <p key={index} className="text-muted-foreground leading-relaxed">
                {paragraph.split("\n").map((line, lineIndex) => (
                  <span key={lineIndex}>
                    {line}
                    {lineIndex < paragraph.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </p>
            ))}
          </div>

          {/* Image - Bottom or Right position */}
          {hasImage && (config.imagePosition === "bottom" || config.imagePosition === "right") && (
            <div className={config.imagePosition === "bottom" ? "w-full" : ""}>
              <img
                src={config.imageUrl}
                alt={title}
                className={`rounded-lg object-cover ${
                  config.imagePosition === "bottom"
                    ? "w-full h-64 md:h-96"
                    : "w-full h-full max-h-96"
                }`}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
