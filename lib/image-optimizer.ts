/**
 * Image Optimization Service
 * US-058: Image optimization pipeline
 *
 * Features:
 * - Auto-resize to multiple sizes (thumbnail, small, medium, large, original)
 * - WebP conversion with JPEG fallback
 * - Blur placeholder generation (base64 LQIP)
 * - Smart compression without visible quality loss
 * - CDN-ready output
 */

import sharp from "sharp"

// Image size presets for responsive images
export const IMAGE_SIZES = {
  thumbnail: { width: 80, height: 80 },
  small: { width: 320, height: 320 },
  medium: { width: 640, height: 640 },
  large: { width: 1024, height: 1024 },
  xlarge: { width: 1920, height: 1920 },
} as const

export type ImageSize = keyof typeof IMAGE_SIZES

// Quality settings per format
const QUALITY_SETTINGS = {
  webp: { quality: 82, effort: 4 }, // Good balance of quality and file size
  jpeg: { quality: 85, mozjpeg: true }, // Fallback format
  png: { compressionLevel: 8 }, // For images with transparency
  avif: { quality: 70, effort: 4 }, // Modern format, smaller files
}

// Blur placeholder settings
const BLUR_PLACEHOLDER = {
  width: 20, // Small size for tiny base64
  height: 20,
  blur: 10,
}

export interface OptimizedImage {
  buffer: Buffer
  format: "webp" | "jpeg" | "png" | "avif"
  width: number
  height: number
  size: number
}

export interface ImageVariant {
  size: ImageSize | "original"
  webp: OptimizedImage
  fallback: OptimizedImage // JPEG or PNG fallback
}

export interface OptimizationResult {
  variants: ImageVariant[]
  blurPlaceholder: string // Base64 data URL
  metadata: {
    originalWidth: number
    originalHeight: number
    originalFormat: string
    hasTransparency: boolean
    totalSavedBytes: number
  }
}

/**
 * Check if image has transparency (alpha channel)
 */
async function hasTransparency(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata()
    return metadata.hasAlpha === true
  } catch {
    return false
  }
}

/**
 * Generate blur placeholder (LQIP - Low Quality Image Placeholder)
 */
async function generateBlurPlaceholder(buffer: Buffer): Promise<string> {
  try {
    const blurBuffer = await sharp(buffer)
      .resize(BLUR_PLACEHOLDER.width, BLUR_PLACEHOLDER.height, {
        fit: "cover",
        position: "center",
      })
      .blur(BLUR_PLACEHOLDER.blur)
      .jpeg({ quality: 40 })
      .toBuffer()

    return `data:image/jpeg;base64,${blurBuffer.toString("base64")}`
  } catch (error) {
    console.error("Error generating blur placeholder:", error)
    // Return a tiny gray placeholder as fallback
    return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q=="
  }
}

/**
 * Optimize image to WebP format
 */
async function toWebP(
  buffer: Buffer,
  width?: number,
  height?: number
): Promise<OptimizedImage> {
  let pipeline = sharp(buffer)

  if (width && height) {
    pipeline = pipeline.resize(width, height, {
      fit: "inside",
      withoutEnlargement: true,
    })
  }

  const result = await pipeline
    .webp(QUALITY_SETTINGS.webp)
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: result.data,
    format: "webp",
    width: result.info.width,
    height: result.info.height,
    size: result.data.length,
  }
}

/**
 * Optimize image to JPEG format (fallback for older browsers)
 */
async function toJpeg(
  buffer: Buffer,
  width?: number,
  height?: number
): Promise<OptimizedImage> {
  let pipeline = sharp(buffer)

  if (width && height) {
    pipeline = pipeline.resize(width, height, {
      fit: "inside",
      withoutEnlargement: true,
    })
  }

  const result = await pipeline
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // Remove transparency
    .jpeg(QUALITY_SETTINGS.jpeg)
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: result.data,
    format: "jpeg",
    width: result.info.width,
    height: result.info.height,
    size: result.data.length,
  }
}

/**
 * Optimize image to PNG format (for images with transparency)
 */
async function toPng(
  buffer: Buffer,
  width?: number,
  height?: number
): Promise<OptimizedImage> {
  let pipeline = sharp(buffer)

  if (width && height) {
    pipeline = pipeline.resize(width, height, {
      fit: "inside",
      withoutEnlargement: true,
    })
  }

  const result = await pipeline
    .png(QUALITY_SETTINGS.png)
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: result.data,
    format: "png",
    width: result.info.width,
    height: result.info.height,
    size: result.data.length,
  }
}

/**
 * Get image metadata
 */
async function getImageMetadata(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata()
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
    hasAlpha: metadata.hasAlpha || false,
  }
}

/**
 * Process and optimize an image into multiple variants
 */
export async function optimizeImage(
  buffer: Buffer,
  options: {
    sizes?: ImageSize[]
    includeOriginal?: boolean
    generateBlur?: boolean
  } = {}
): Promise<OptimizationResult> {
  const {
    sizes = ["thumbnail", "small", "medium", "large"],
    includeOriginal = true,
    generateBlur = true,
  } = options

  // Get original metadata
  const metadata = await getImageMetadata(buffer)
  const transparent = await hasTransparency(buffer)

  // Calculate original size
  const originalSize = buffer.length

  // Generate blur placeholder
  const blurPlaceholder = generateBlur
    ? await generateBlurPlaceholder(buffer)
    : ""

  // Generate variants for each size
  const variants: ImageVariant[] = []
  let totalOptimizedSize = 0

  for (const sizeName of sizes) {
    const sizeConfig = IMAGE_SIZES[sizeName]

    // Skip sizes larger than original
    if (
      sizeConfig.width > metadata.width &&
      sizeConfig.height > metadata.height
    ) {
      continue
    }

    const webp = await toWebP(buffer, sizeConfig.width, sizeConfig.height)
    const fallback = transparent
      ? await toPng(buffer, sizeConfig.width, sizeConfig.height)
      : await toJpeg(buffer, sizeConfig.width, sizeConfig.height)

    variants.push({
      size: sizeName,
      webp,
      fallback,
    })

    totalOptimizedSize += webp.size
  }

  // Include original size variant if requested
  if (includeOriginal) {
    const webp = await toWebP(buffer)
    const fallback = transparent ? await toPng(buffer) : await toJpeg(buffer)

    variants.push({
      size: "original",
      webp,
      fallback,
    })

    totalOptimizedSize += webp.size
  }

  return {
    variants,
    blurPlaceholder,
    metadata: {
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      originalFormat: metadata.format,
      hasTransparency: transparent,
      totalSavedBytes: Math.max(0, originalSize - totalOptimizedSize),
    },
  }
}

/**
 * Quickly optimize a single image for upload
 * Returns WebP with JPEG fallback at the requested size
 */
export async function quickOptimize(
  buffer: Buffer,
  maxWidth: number = 1920,
  maxHeight: number = 1920
): Promise<{
  webp: Buffer
  jpeg: Buffer
  blurPlaceholder: string
  metadata: {
    width: number
    height: number
    webpSize: number
    jpegSize: number
  }
}> {
  const metadata = await getImageMetadata(buffer)

  // Resize if larger than max dimensions
  let processBuffer = buffer
  if (metadata.width > maxWidth || metadata.height > maxHeight) {
    processBuffer = await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer()
  }

  const webp = await toWebP(processBuffer)
  const jpeg = await toJpeg(processBuffer)
  const blurPlaceholder = await generateBlurPlaceholder(processBuffer)

  return {
    webp: webp.buffer,
    jpeg: jpeg.buffer,
    blurPlaceholder,
    metadata: {
      width: webp.width,
      height: webp.height,
      webpSize: webp.size,
      jpegSize: jpeg.size,
    },
  }
}

/**
 * Generate srcset string for responsive images
 */
export function generateSrcSet(
  baseUrl: string,
  variants: ImageVariant[]
): { webp: string; fallback: string } {
  const webpSet = variants
    .filter((v) => v.size !== "original")
    .map((v) => {
      const url = baseUrl.replace(/\.[^.]+$/, `-${v.size}.webp`)
      return `${url} ${v.webp.width}w`
    })
    .join(", ")

  const fallbackSet = variants
    .filter((v) => v.size !== "original")
    .map((v) => {
      const ext = v.fallback.format === "png" ? "png" : "jpg"
      const url = baseUrl.replace(/\.[^.]+$/, `-${v.size}.${ext}`)
      return `${url} ${v.fallback.width}w`
    })
    .join(", ")

  return { webp: webpSet, fallback: fallbackSet }
}

/**
 * Generate responsive sizes attribute
 */
export function generateSizesAttribute(
  defaultSize: string = "100vw"
): string {
  return `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, ${defaultSize}`
}
