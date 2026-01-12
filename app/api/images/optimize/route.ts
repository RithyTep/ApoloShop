/**
 * Image Optimization API
 * US-058: Image optimization pipeline
 *
 * POST /api/images/optimize
 * - Accepts image file upload
 * - Returns optimized WebP with JPEG fallback
 * - Generates blur placeholder
 * - Auto-resize to multiple sizes
 * - Uploads all variants to R2/CDN
 */

import { NextRequest, NextResponse } from "next/server"
import { uploadToR2 } from "@/lib/r2"
import { validateFile, DEFAULT_ALLOWED_TYPES } from "@/lib/secure-upload"
import {
  optimizeImage,
  quickOptimize,
  IMAGE_SIZES,
  type ImageSize,
} from "@/lib/image-optimizer"

// Maximum file size for optimization (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

interface OptimizedUploadResult {
  original: {
    url: string
    key: string
  }
  webp: {
    url: string
    key: string
    size: number
  }
  fallback: {
    url: string
    key: string
    format: string
    size: number
  }
  variants: {
    [key in ImageSize]?: {
      webp: { url: string; key: string }
      fallback: { url: string; key: string }
    }
  }
  blurPlaceholder: string
  metadata: {
    originalWidth: number
    originalHeight: number
    totalSavedBytes: number
    compressionRatio: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folder = (formData.get("folder") as string) || "products"
    const generateVariants = formData.get("variants") !== "false"
    const sizesParam = formData.get("sizes") as string | null

    // Parse requested sizes
    const requestedSizes: ImageSize[] = sizesParam
      ? (sizesParam.split(",") as ImageSize[]).filter((s) => s in IMAGE_SIZES)
      : ["thumbnail", "small", "medium", "large"]

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      )
    }

    // Convert to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Validate file type and content
    const validation = await validateFile(buffer, file.type, file.name, {
      allowedTypes: DEFAULT_ALLOWED_TYPES,
      maxSize: MAX_FILE_SIZE,
    })

    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid image file", details: validation.errors },
        { status: 400 }
      )
    }

    const originalSize = buffer.length
    const timestamp = Date.now()
    const baseName = `${timestamp}-${Math.random().toString(36).slice(2, 8)}`

    // Quick optimize for single upload (faster)
    if (!generateVariants) {
      const optimized = await quickOptimize(buffer)

      // Upload WebP version
      const webpResult = await uploadToR2(
        optimized.webp,
        `${baseName}.webp`,
        "image/webp",
        folder
      )

      // Upload JPEG fallback
      const jpegResult = await uploadToR2(
        optimized.jpeg,
        `${baseName}.jpg`,
        "image/jpeg",
        folder
      )

      const savedBytes = originalSize - optimized.metadata.webpSize
      const compressionRatio =
        originalSize > 0
          ? Math.round((1 - optimized.metadata.webpSize / originalSize) * 100)
          : 0

      return NextResponse.json({
        success: true,
        url: webpResult.url, // Primary URL (WebP)
        fallbackUrl: jpegResult.url,
        blurPlaceholder: optimized.blurPlaceholder,
        metadata: {
          width: optimized.metadata.width,
          height: optimized.metadata.height,
          originalSize,
          optimizedSize: optimized.metadata.webpSize,
          savedBytes,
          compressionRatio: `${compressionRatio}%`,
        },
      })
    }

    // Full optimization with variants
    const result = await optimizeImage(buffer, {
      sizes: requestedSizes,
      includeOriginal: true,
      generateBlur: true,
    })

    // Upload all variants to R2
    const uploads: OptimizedUploadResult = {
      original: { url: "", key: "" },
      webp: { url: "", key: "", size: 0 },
      fallback: { url: "", key: "", format: "", size: 0 },
      variants: {},
      blurPlaceholder: result.blurPlaceholder,
      metadata: {
        originalWidth: result.metadata.originalWidth,
        originalHeight: result.metadata.originalHeight,
        totalSavedBytes: result.metadata.totalSavedBytes,
        compressionRatio: 0,
      },
    }

    // Upload each variant
    for (const variant of result.variants) {
      const sizeLabel = variant.size === "original" ? "" : `-${variant.size}`

      // Upload WebP
      const webpKey = `${baseName}${sizeLabel}.webp`
      const webpUpload = await uploadToR2(
        variant.webp.buffer,
        webpKey,
        "image/webp",
        folder
      )

      // Upload fallback (JPEG or PNG)
      const fallbackExt = variant.fallback.format === "png" ? "png" : "jpg"
      const fallbackMime =
        variant.fallback.format === "png" ? "image/png" : "image/jpeg"
      const fallbackKey = `${baseName}${sizeLabel}.${fallbackExt}`
      const fallbackUpload = await uploadToR2(
        variant.fallback.buffer,
        fallbackKey,
        fallbackMime,
        folder
      )

      if (variant.size === "original") {
        uploads.original = { url: webpUpload.url, key: webpUpload.key }
        uploads.webp = {
          url: webpUpload.url,
          key: webpUpload.key,
          size: variant.webp.size,
        }
        uploads.fallback = {
          url: fallbackUpload.url,
          key: fallbackUpload.key,
          format: variant.fallback.format,
          size: variant.fallback.size,
        }
      } else {
        uploads.variants[variant.size] = {
          webp: { url: webpUpload.url, key: webpUpload.key },
          fallback: { url: fallbackUpload.url, key: fallbackUpload.key },
        }
      }
    }

    // Calculate compression ratio
    uploads.metadata.compressionRatio =
      originalSize > 0
        ? Math.round((1 - uploads.webp.size / originalSize) * 100)
        : 0

    return NextResponse.json({
      success: true,
      ...uploads,
    })
  } catch (error) {
    console.error("Image optimization error:", error)
    return NextResponse.json(
      { error: "Image optimization failed" },
      { status: 500 }
    )
  }
}
