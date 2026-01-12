/**
 * Secure File Upload Utilities
 * US-049: Security measures for file uploads
 *
 * Features:
 * - Magic byte validation (validates by file signature, not just extension)
 * - Configurable max file size (default 5MB)
 * - Random UUID filename generation
 * - Signed URLs with expiry for secure file serving
 * - Optional ClamAV malware scanning (when available)
 */

import crypto from "crypto"

// ============================================
// FILE TYPE DETECTION BY MAGIC BYTES
// ============================================

/**
 * Magic byte signatures for common file types
 * Each entry contains the hex signature and the expected mime type
 */
export const MAGIC_BYTES: {
  signature: number[]
  offset?: number
  mimeType: string
  extensions: string[]
}[] = [
  // Images
  {
    signature: [0xff, 0xd8, 0xff],
    mimeType: "image/jpeg",
    extensions: ["jpg", "jpeg"],
  },
  {
    signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    mimeType: "image/png",
    extensions: ["png"],
  },
  {
    signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    mimeType: "image/gif",
    extensions: ["gif"],
  },
  {
    signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    mimeType: "image/gif",
    extensions: ["gif"],
  },
  {
    signature: [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP starts with RIFF...WEBP)
    mimeType: "image/webp",
    extensions: ["webp"],
  },
  {
    signature: [0x00, 0x00, 0x00], // AVIF/HEIF container (ftyp at offset 4)
    mimeType: "image/avif",
    extensions: ["avif", "heic", "heif"],
  },
  // SVG (text-based, check for XML declaration or svg tag)
  {
    signature: [0x3c, 0x3f, 0x78, 0x6d, 0x6c], // <?xml
    mimeType: "image/svg+xml",
    extensions: ["svg"],
  },
  {
    signature: [0x3c, 0x73, 0x76, 0x67], // <svg
    mimeType: "image/svg+xml",
    extensions: ["svg"],
  },
  // Documents
  {
    signature: [0x25, 0x50, 0x44, 0x46], // %PDF
    mimeType: "application/pdf",
    extensions: ["pdf"],
  },
  // Archives (if needed in future)
  {
    signature: [0x50, 0x4b, 0x03, 0x04], // ZIP (also DOCX, XLSX, etc.)
    mimeType: "application/zip",
    extensions: ["zip", "docx", "xlsx", "pptx"],
  },
]

/**
 * WebP specific check - RIFF header followed by WEBP at offset 8
 */
function isWebP(buffer: Buffer): boolean {
  if (buffer.length < 12) return false
  const riff = buffer.slice(0, 4).toString("ascii")
  const webp = buffer.slice(8, 12).toString("ascii")
  return riff === "RIFF" && webp === "WEBP"
}

/**
 * AVIF/HEIF specific check - look for 'ftyp' box with avif/heic brand
 */
function isAVIF(buffer: Buffer): boolean {
  if (buffer.length < 12) return false
  // ftyp box starts at offset 4
  const ftyp = buffer.slice(4, 8).toString("ascii")
  if (ftyp !== "ftyp") return false
  // Check for avif, heic, or mif1 brand
  const brand = buffer.slice(8, 12).toString("ascii")
  return ["avif", "avis", "heic", "heix", "mif1"].includes(brand)
}

/**
 * Detect file type by magic bytes
 * @param buffer - File buffer to analyze
 * @returns Detected mime type or null if unknown
 */
export function detectFileType(buffer: Buffer): {
  mimeType: string
  extension: string
} | null {
  if (buffer.length < 8) return null

  // Special handling for WebP (RIFF container)
  if (isWebP(buffer)) {
    return { mimeType: "image/webp", extension: "webp" }
  }

  // Special handling for AVIF/HEIF
  if (isAVIF(buffer)) {
    return { mimeType: "image/avif", extension: "avif" }
  }

  // Check other magic bytes
  for (const { signature, offset = 0, mimeType, extensions } of MAGIC_BYTES) {
    // Skip RIFF and AVIF patterns (handled specially above)
    if (
      mimeType === "image/webp" ||
      mimeType === "image/avif"
    ) {
      continue
    }

    const bufferSlice = buffer.slice(offset, offset + signature.length)
    const matches = signature.every(
      (byte, index) => bufferSlice[index] === byte
    )

    if (matches) {
      return { mimeType, extension: extensions[0] }
    }
  }

  return null
}

/**
 * Validate that file content matches the declared mime type
 * @param buffer - File buffer
 * @param declaredMimeType - Mime type declared by the client
 * @returns Validation result
 */
export function validateFileType(
  buffer: Buffer,
  declaredMimeType: string
): {
  valid: boolean
  detectedType: { mimeType: string; extension: string } | null
  error?: string
} {
  const detected = detectFileType(buffer)

  if (!detected) {
    return {
      valid: false,
      detectedType: null,
      error: "Unable to detect file type from content",
    }
  }

  // Normalize mime types for comparison (some browsers send different variants)
  const normalizedDeclared = normalizeMimeType(declaredMimeType)
  const normalizedDetected = normalizeMimeType(detected.mimeType)

  if (normalizedDeclared !== normalizedDetected) {
    return {
      valid: false,
      detectedType: detected,
      error: `File type mismatch: declared ${declaredMimeType}, detected ${detected.mimeType}`,
    }
  }

  return { valid: true, detectedType: detected }
}

/**
 * Normalize mime type for comparison
 */
function normalizeMimeType(mimeType: string): string {
  // Handle common variants
  const normalized = mimeType.toLowerCase().trim()

  // JPEG variants
  if (normalized === "image/jpg") return "image/jpeg"

  return normalized
}

// ============================================
// ALLOWED FILE TYPES CONFIGURATION
// ============================================

/**
 * Default allowed file types for uploads
 */
export const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const

/**
 * Extended allowed types (includes SVG and PDF)
 */
export const EXTENDED_ALLOWED_TYPES = [
  ...DEFAULT_ALLOWED_TYPES,
  "image/svg+xml",
  "application/pdf",
] as const

/**
 * Check if a mime type is in the allowed list
 */
export function isAllowedType(
  mimeType: string,
  allowedTypes: readonly string[] = DEFAULT_ALLOWED_TYPES
): boolean {
  const normalized = normalizeMimeType(mimeType)
  return allowedTypes.some(
    (allowed) => normalizeMimeType(allowed) === normalized
  )
}

// ============================================
// FILE SIZE LIMITS
// ============================================

/**
 * Default max file size: 5MB
 */
export const DEFAULT_MAX_SIZE = 5 * 1024 * 1024

/**
 * Max file sizes by type (in bytes)
 */
export const MAX_SIZE_BY_TYPE: Record<string, number> = {
  "image/jpeg": 10 * 1024 * 1024, // 10MB for JPEG
  "image/png": 10 * 1024 * 1024, // 10MB for PNG
  "image/webp": 10 * 1024 * 1024, // 10MB for WebP
  "image/gif": 5 * 1024 * 1024, // 5MB for GIF (to limit animated GIF abuse)
  "image/avif": 10 * 1024 * 1024, // 10MB for AVIF
  "image/svg+xml": 1 * 1024 * 1024, // 1MB for SVG (security risk)
  "application/pdf": 20 * 1024 * 1024, // 20MB for PDF
}

/**
 * Get max allowed size for a file type
 */
export function getMaxSize(
  mimeType: string,
  defaultMax: number = DEFAULT_MAX_SIZE
): number {
  const normalized = normalizeMimeType(mimeType)
  return MAX_SIZE_BY_TYPE[normalized] || defaultMax
}

/**
 * Validate file size
 */
export function validateFileSize(
  size: number,
  mimeType: string,
  maxSize?: number
): { valid: boolean; error?: string } {
  const limit = maxSize ?? getMaxSize(mimeType)

  if (size > limit) {
    const limitMB = (limit / (1024 * 1024)).toFixed(1)
    const sizeMB = (size / (1024 * 1024)).toFixed(2)
    return {
      valid: false,
      error: `File too large: ${sizeMB}MB exceeds limit of ${limitMB}MB`,
    }
  }

  return { valid: true }
}

// ============================================
// SECURE FILENAME GENERATION
// ============================================

/**
 * Generate a secure random filename using UUID v4
 * @param originalName - Original filename (used only for extension)
 * @param detectedExtension - Extension detected from magic bytes (preferred)
 * @returns Secure random filename
 */
export function generateSecureFileName(
  originalName: string,
  detectedExtension?: string
): string {
  // Use UUID v4 for random filename
  const uuid = crypto.randomUUID()

  // Prefer detected extension over original (more secure)
  let extension = detectedExtension

  if (!extension) {
    // Extract extension from original name and sanitize
    const parts = originalName.split(".")
    if (parts.length > 1) {
      extension = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "")
    }
  }

  // Default to 'bin' if no valid extension
  if (!extension || extension.length === 0 || extension.length > 10) {
    extension = "bin"
  }

  return `${uuid}.${extension}`
}

// ============================================
// SIGNED URL GENERATION
// ============================================

/**
 * Secret key for signing URLs (should be in env var in production)
 */
const SIGNED_URL_SECRET = process.env.UPLOAD_URL_SECRET || "apoloshop-upload-secret-key-change-in-production"

/**
 * Default signed URL expiry: 1 hour
 */
export const DEFAULT_SIGNED_URL_EXPIRY = 60 * 60 // 1 hour in seconds

/**
 * Generate a signed URL for secure file access
 * @param fileKey - The file key/path in storage
 * @param expiresIn - Expiry time in seconds (default 1 hour)
 * @returns Signed URL parameters
 */
export function generateSignedUrlParams(
  fileKey: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): {
  expires: number
  signature: string
} {
  const expires = Math.floor(Date.now() / 1000) + expiresIn

  const data = `${fileKey}:${expires}`
  const signature = crypto
    .createHmac("sha256", SIGNED_URL_SECRET)
    .update(data)
    .digest("hex")

  return { expires, signature }
}

/**
 * Verify a signed URL
 * @param fileKey - The file key/path
 * @param expires - Expiry timestamp
 * @param signature - The signature to verify
 * @returns Whether the signature is valid and not expired
 */
export function verifySignedUrl(
  fileKey: string,
  expires: number,
  signature: string
): { valid: boolean; error?: string } {
  // Check expiry
  const now = Math.floor(Date.now() / 1000)
  if (now > expires) {
    return { valid: false, error: "URL has expired" }
  }

  // Verify signature
  const data = `${fileKey}:${expires}`
  const expectedSignature = crypto
    .createHmac("sha256", SIGNED_URL_SECRET)
    .update(data)
    .digest("hex")

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return { valid: false, error: "Invalid signature" }
  }

  return { valid: true }
}

/**
 * Build a complete signed URL
 */
export function buildSignedUrl(
  baseUrl: string,
  fileKey: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): string {
  const { expires, signature } = generateSignedUrlParams(fileKey, expiresIn)
  const url = new URL(baseUrl)
  url.searchParams.set("key", fileKey)
  url.searchParams.set("expires", String(expires))
  url.searchParams.set("signature", signature)
  return url.toString()
}

// ============================================
// SVG SECURITY (XSS PREVENTION)
// ============================================

/**
 * Dangerous patterns in SVG that could lead to XSS
 */
const SVG_DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i, // onclick, onerror, etc.
  /<foreignObject/i,
  /<use\s+[^>]*href\s*=\s*["']?[^#]/i, // external use references
  /xlink:href\s*=\s*["']?(?!#)/i, // external xlink references
  /data:/i, // data URIs (can contain malicious content)
]

/**
 * Validate SVG content for security
 * @param content - SVG content as string
 * @returns Validation result
 */
export function validateSVGContent(content: string): {
  safe: boolean
  issues: string[]
} {
  const issues: string[] = []

  for (const pattern of SVG_DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      issues.push(`Potentially dangerous pattern detected: ${pattern.source}`)
    }
  }

  return {
    safe: issues.length === 0,
    issues,
  }
}

// ============================================
// CLAMAV MALWARE SCANNING (OPTIONAL)
// ============================================

/**
 * ClamAV server configuration
 */
const CLAMAV_HOST = process.env.CLAMAV_HOST || ""
const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT || "3310", 10)

/**
 * Check if ClamAV is configured
 */
export function isClamAVConfigured(): boolean {
  return CLAMAV_HOST.length > 0
}

/**
 * Scan file with ClamAV (if configured)
 * This is a placeholder - actual implementation requires clamav client
 * @param buffer - File buffer to scan
 * @returns Scan result
 */
export async function scanForMalware(
  buffer: Buffer
): Promise<{
  scanned: boolean
  clean: boolean
  threat?: string
  error?: string
}> {
  if (!isClamAVConfigured()) {
    return {
      scanned: false,
      clean: true, // Assume clean if ClamAV not configured
      error: "ClamAV not configured",
    }
  }

  try {
    // Note: Actual ClamAV integration would use a client library like 'clamscan'
    // This is a placeholder that would connect to ClamAV daemon
    // const clamscan = require('clamscan')
    // const scanner = await new clamscan({...}).init()
    // const result = await scanner.scanBuffer(buffer)

    // For now, return a placeholder response
    // In production, implement actual ClamAV integration
    console.log(`ClamAV scan: Would scan ${buffer.length} bytes at ${CLAMAV_HOST}:${CLAMAV_PORT}`)

    return {
      scanned: false,
      clean: true,
      error: "ClamAV integration pending - scan skipped",
    }
  } catch (error) {
    console.error("ClamAV scan error:", error)
    return {
      scanned: false,
      clean: true, // Fail open (allow upload) but log error
      error: `ClamAV scan failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================
// COMPREHENSIVE FILE VALIDATION
// ============================================

export interface FileValidationOptions {
  /** Allowed mime types (default: DEFAULT_ALLOWED_TYPES) */
  allowedTypes?: readonly string[]
  /** Max file size in bytes (default: based on type) */
  maxSize?: number
  /** Whether to scan for malware (default: true if ClamAV configured) */
  scanMalware?: boolean
  /** Whether to validate SVG content for XSS (default: true) */
  validateSVG?: boolean
}

export interface FileValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  detectedType: { mimeType: string; extension: string } | null
  secureFileName?: string
  malwareScan?: {
    scanned: boolean
    clean: boolean
    threat?: string
  }
}

/**
 * Comprehensive file validation
 * @param buffer - File buffer
 * @param declaredMimeType - Mime type declared by client
 * @param originalName - Original filename
 * @param options - Validation options
 */
export async function validateFile(
  buffer: Buffer,
  declaredMimeType: string,
  originalName: string,
  options: FileValidationOptions = {}
): Promise<FileValidationResult> {
  const {
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    maxSize,
    scanMalware = isClamAVConfigured(),
    validateSVG = true,
  } = options

  const errors: string[] = []
  const warnings: string[] = []

  // 1. Validate file type by magic bytes
  const typeValidation = validateFileType(buffer, declaredMimeType)

  if (!typeValidation.valid) {
    errors.push(typeValidation.error || "Invalid file type")
  }

  const detectedType = typeValidation.detectedType

  // 2. Check if type is allowed
  if (detectedType && !isAllowedType(detectedType.mimeType, allowedTypes)) {
    errors.push(`File type ${detectedType.mimeType} is not allowed`)
  }

  // 3. Validate file size
  const sizeValidation = validateFileSize(
    buffer.length,
    detectedType?.mimeType || declaredMimeType,
    maxSize
  )
  if (!sizeValidation.valid) {
    errors.push(sizeValidation.error || "File too large")
  }

  // 4. SVG content validation
  if (
    validateSVG &&
    detectedType?.mimeType === "image/svg+xml"
  ) {
    const svgContent = buffer.toString("utf-8")
    const svgValidation = validateSVGContent(svgContent)
    if (!svgValidation.safe) {
      errors.push("SVG contains potentially dangerous content")
      svgValidation.issues.forEach((issue) => warnings.push(issue))
    }
  }

  // 5. Malware scan (if enabled and configured)
  let malwareScan: FileValidationResult["malwareScan"]
  if (scanMalware) {
    const scanResult = await scanForMalware(buffer)
    malwareScan = {
      scanned: scanResult.scanned,
      clean: scanResult.clean,
      threat: scanResult.threat,
    }
    if (!scanResult.clean && scanResult.threat) {
      errors.push(`Malware detected: ${scanResult.threat}`)
    }
    if (scanResult.error) {
      warnings.push(scanResult.error)
    }
  }

  // Generate secure filename
  const secureFileName = generateSecureFileName(
    originalName,
    detectedType?.extension
  )

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    detectedType,
    secureFileName,
    malwareScan,
  }
}

// ============================================
// UPLOAD AUDIT LOGGING
// ============================================

export interface UploadLogEntry {
  timestamp: Date
  originalName: string
  secureFileName: string
  mimeType: string
  size: number
  success: boolean
  errors?: string[]
  clientIp?: string
  userId?: string
}

/**
 * Create an upload log entry (for audit purposes)
 */
export function createUploadLogEntry(
  data: Omit<UploadLogEntry, "timestamp">
): UploadLogEntry {
  return {
    ...data,
    timestamp: new Date(),
  }
}
