/**
 * Secure File Upload API
 * US-049: Security measures for file uploads
 *
 * Features:
 * - Magic byte validation (not just extension)
 * - Configurable max file size (default 5MB, type-specific limits)
 * - Random UUID filenames
 * - Optional ClamAV malware scanning
 * - SVG XSS validation
 */

import { NextRequest, NextResponse } from "next/server"
import { uploadToR2, deleteFromR2, extractKeyFromUrl } from "@/lib/r2"
import {
  validateFile,
  DEFAULT_ALLOWED_TYPES,
  EXTENDED_ALLOWED_TYPES,
  createUploadLogEntry,
  generateSignedUrlParams,
} from "@/lib/secure-upload"

// POST /api/upload - Secure file upload to R2
export async function POST(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folder = (formData.get("folder") as string) || "uploads"
    // Optional: allow extended file types (SVG, PDF) with explicit flag
    const allowExtended = formData.get("allowExtended") === "true"
    // Optional: custom max size in bytes
    const customMaxSize = formData.get("maxSize")
      ? parseInt(formData.get("maxSize") as string, 10)
      : undefined

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Convert to buffer for magic byte analysis
    const buffer = Buffer.from(await file.arrayBuffer())

    // Comprehensive security validation
    const validation = await validateFile(
      buffer,
      file.type,
      file.name,
      {
        allowedTypes: allowExtended ? EXTENDED_ALLOWED_TYPES : DEFAULT_ALLOWED_TYPES,
        maxSize: customMaxSize,
        scanMalware: true,
        validateSVG: true,
      }
    )

    // Log upload attempt (for audit trail)
    const logEntry = createUploadLogEntry({
      originalName: file.name,
      secureFileName: validation.secureFileName || "unknown",
      mimeType: validation.detectedType?.mimeType || file.type,
      size: buffer.length,
      success: validation.valid,
      errors: validation.errors.length > 0 ? validation.errors : undefined,
      clientIp,
    })

    // Log for monitoring (in production, send to logging service)
    if (!validation.valid) {
      console.warn("Upload rejected:", logEntry)
      return NextResponse.json(
        {
          error: "File validation failed",
          details: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      )
    }

    // Log warnings (but proceed with upload)
    if (validation.warnings.length > 0) {
      console.warn("Upload warnings:", validation.warnings)
    }

    // Use the secure filename generated from magic byte detection
    const secureFileName = validation.secureFileName!
    const detectedMimeType = validation.detectedType?.mimeType || file.type

    // Upload to R2 with secure filename
    const result = await uploadToR2(buffer, secureFileName, detectedMimeType, folder)

    // Generate signed URL parameters for secure access
    const signedParams = generateSignedUrlParams(result.key)

    console.log("Upload successful:", {
      ...logEntry,
      success: true,
      key: result.key,
    })

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
      // Include signed URL parameters for secure access
      signedAccess: {
        expires: signedParams.expires,
        signature: signedParams.signature,
      },
      // Include validation metadata
      metadata: {
        detectedType: validation.detectedType?.mimeType,
        originalName: file.name,
        secureFileName,
        size: buffer.length,
        malwareScanned: validation.malwareScan?.scanned ?? false,
      },
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    )
  }
}

// DELETE /api/upload - Delete file from R2
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")
    const key = searchParams.get("key")

    // Get key from URL or directly
    const fileKey = key || (url ? extractKeyFromUrl(url) : null)

    if (!fileKey) {
      return NextResponse.json(
        { error: "No file key or URL provided" },
        { status: 400 }
      )
    }

    await deleteFromR2(fileKey)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    )
  }
}
