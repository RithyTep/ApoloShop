"use client"

/**
 * OptimizedImage Component
 * US-058: Image optimization pipeline
 *
 * Features:
 * - Automatic WebP with fallback
 * - Lazy loading with blur placeholder (LQIP)
 * - Responsive srcset generation
 * - Native lazy loading + intersection observer
 * - Smooth fade-in transition
 */

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { cn } from "@/lib/utils"

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  imgClassName?: string
  blurPlaceholder?: string
  priority?: boolean
  sizes?: string
  fill?: boolean
  aspectRatio?: "square" | "video" | "wide" | "portrait" | "auto"
  objectFit?: "cover" | "contain" | "fill" | "none"
  onLoad?: () => void
  onError?: () => void
}

// Default blur placeholder (gray)
const DEFAULT_BLUR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQREiExQQUGYXH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AuW0Qju4nk0h1BOQhPHfVLXu68hl4LqVdNFGQ0qyYKsPnfOaKKD//2Q=="

// Aspect ratio values
const ASPECT_RATIOS = {
  square: "aspect-square",
  video: "aspect-video",
  wide: "aspect-[21/9]",
  portrait: "aspect-[3/4]",
  auto: "",
}

// Object fit values
const OBJECT_FIT = {
  cover: "object-cover",
  contain: "object-contain",
  fill: "object-fill",
  none: "object-none",
}

/**
 * Generate WebP URL from original URL
 */
function getWebPUrl(url: string): string {
  if (!url || url.includes(".webp")) return url
  // Replace extension with .webp
  return url.replace(/\.(jpe?g|png|gif|avif)$/i, ".webp")
}

/**
 * Generate srcset for responsive images
 */
function generateSrcset(baseUrl: string, isWebP: boolean = false): string {
  if (!baseUrl || baseUrl.includes("placeholder")) return ""

  const sizes = [320, 640, 1024, 1920]
  const ext = isWebP ? ".webp" : ""
  const pattern = /(-\w+)?\.(jpe?g|png|gif|webp|avif)$/i

  return sizes
    .map((size) => {
      const sizedUrl = baseUrl.replace(
        pattern,
        `-${getSizeKey(size)}${ext || ".$2"}`
      )
      return `${sizedUrl} ${size}w`
    })
    .join(", ")
}

function getSizeKey(width: number): string {
  if (width <= 80) return "thumbnail"
  if (width <= 320) return "small"
  if (width <= 640) return "medium"
  if (width <= 1024) return "large"
  return "xlarge"
}

/**
 * Optimized Image Component with lazy loading and blur placeholder
 */
function OptimizedImageComponent({
  src,
  alt,
  width,
  height,
  className,
  imgClassName,
  blurPlaceholder,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  fill = false,
  aspectRatio = "auto",
  objectFit = "cover",
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isVisible) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: "200px", // Start loading 200px before visible
        threshold: 0,
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [priority, isVisible])

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  // Handle image error - fallback to original src
  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  // Get URLs
  const webpUrl = getWebPUrl(src)
  const fallbackUrl = src
  const placeholder = blurPlaceholder || DEFAULT_BLUR

  // Determine if we should use native lazy loading
  const loading = priority ? "eager" : "lazy"
  const fetchPriority = priority ? "high" : "auto"

  // Container classes
  const containerClasses = cn(
    "relative overflow-hidden",
    ASPECT_RATIOS[aspectRatio],
    fill && "w-full h-full",
    className
  )

  // Image classes
  const imageClasses = cn(
    "transition-opacity duration-300 ease-out",
    OBJECT_FIT[objectFit],
    fill && "absolute inset-0 w-full h-full",
    !fill && "w-full h-full",
    isLoaded ? "opacity-100" : "opacity-0",
    imgClassName
  )

  // Blur placeholder classes
  const blurClasses = cn(
    "absolute inset-0 w-full h-full transition-opacity duration-500 ease-out",
    OBJECT_FIT[objectFit],
    isLoaded ? "opacity-0" : "opacity-100",
    "blur-lg scale-110" // Slight scale to prevent edge artifacts
  )

  return (
    <div ref={containerRef} className={containerClasses}>
      {/* Blur placeholder background */}
      <img
        src={placeholder}
        alt=""
        aria-hidden="true"
        className={blurClasses}
        style={{
          filter: isLoaded ? "blur(0)" : "blur(20px)",
        }}
      />

      {/* Main image with picture element for WebP support */}
      {isVisible && (
        <picture>
          {/* WebP source */}
          {!hasError && (
            <source
              type="image/webp"
              srcSet={generateSrcset(src, true) || webpUrl}
              sizes={sizes}
            />
          )}

          {/* Fallback source */}
          <source
            type={getSourceType(fallbackUrl)}
            srcSet={generateSrcset(src, false) || fallbackUrl}
            sizes={sizes}
          />

          {/* Fallback img */}
          <img
            ref={imgRef}
            src={hasError ? fallbackUrl : webpUrl}
            alt={alt}
            width={width}
            height={height}
            loading={loading}
            fetchPriority={fetchPriority as "high" | "low" | "auto"}
            decoding="async"
            className={imageClasses}
            onLoad={handleLoad}
            onError={handleError}
          />
        </picture>
      )}
    </div>
  )
}

/**
 * Get MIME type from URL
 */
function getSourceType(url: string): string {
  if (url.includes(".webp")) return "image/webp"
  if (url.includes(".png")) return "image/png"
  if (url.includes(".gif")) return "image/gif"
  if (url.includes(".avif")) return "image/avif"
  return "image/jpeg"
}

// Memoize to prevent unnecessary re-renders
export const OptimizedImage = memo(OptimizedImageComponent)

/**
 * Hook to upload and optimize images
 */
export function useImageOptimizer() {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const upload = async (
    file: File,
    options: {
      folder?: string
      variants?: boolean
      sizes?: string[]
    } = {}
  ) => {
    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (options.folder) formData.append("folder", options.folder)
      if (options.variants === false) formData.append("variants", "false")
      if (options.sizes) formData.append("sizes", options.sizes.join(","))

      setProgress(30)

      const response = await fetch("/api/images/optimize", {
        method: "POST",
        body: formData,
      })

      setProgress(80)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Upload failed")
      }

      const data = await response.json()
      setProgress(100)

      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed"
      setError(message)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  return { upload, isUploading, progress, error }
}
