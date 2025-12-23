"use client"

import { useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { GalleryConfig } from "@/lib/api-hooks"

interface GalleryRendererProps {
  config: GalleryConfig
  language: "EN" | "KH"
}

export function GalleryRenderer({ config, language }: GalleryRendererProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const title = language === "EN" ? config.titleEn : config.titleKh

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)

  const goNext = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % config.images.length)
    }
  }

  const goPrev = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + config.images.length) % config.images.length)
    }
  }

  if (config.images.length === 0) {
    return null
  }

  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  }

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">{title}</h2>
        )}

        {config.layout === "carousel" ? (
          <div className="relative">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4">
              {config.images.map((image, index) => (
                <div
                  key={image.id}
                  className="flex-none w-80 snap-start cursor-pointer"
                  onClick={() => openLightbox(index)}
                >
                  <img
                    src={image.url}
                    alt={language === "EN" ? image.captionEn : image.captionKh || ""}
                    className="w-full h-60 object-cover rounded-lg hover:opacity-90 transition-opacity"
                  />
                  {(image.captionEn || image.captionKh) && (
                    <p className="mt-2 text-sm text-muted-foreground text-center">
                      {language === "EN" ? image.captionEn : image.captionKh}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`grid ${gridCols[config.columns]} gap-4`}>
            {config.images.map((image, index) => (
              <div
                key={image.id}
                className={`cursor-pointer group ${
                  config.layout === "masonry" && index % 3 === 0 ? "row-span-2" : ""
                }`}
                onClick={() => openLightbox(index)}
              >
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src={image.url}
                    alt={language === "EN" ? image.captionEn : image.captionKh || ""}
                    className={`w-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                      config.layout === "masonry" && index % 3 === 0 ? "h-[500px]" : "h-60"
                    }`}
                  />
                  {(image.captionEn || image.captionKh) && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <p className="text-white text-sm">
                        {language === "EN" ? image.captionEn : image.captionKh}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeLightbox()
            }}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X size={32} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            className="absolute left-4 text-white hover:text-gray-300 transition-colors"
          >
            <ChevronLeft size={48} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className="absolute right-4 text-white hover:text-gray-300 transition-colors"
          >
            <ChevronRight size={48} />
          </button>

          <div className="max-w-4xl max-h-[80vh] p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={config.images[lightboxIndex].url}
              alt=""
              className="max-w-full max-h-[70vh] object-contain mx-auto"
            />
            {(config.images[lightboxIndex].captionEn || config.images[lightboxIndex].captionKh) && (
              <p className="text-white text-center mt-4">
                {language === "EN"
                  ? config.images[lightboxIndex].captionEn
                  : config.images[lightboxIndex].captionKh}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
