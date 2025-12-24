import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "apoloshop"
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL // e.g., https://pub-xxx.r2.dev or custom domain

// S3-compatible client for R2
export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// Generate unique filename
export function generateFileName(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = originalName.split(".").pop()?.toLowerCase() || "jpg"
  return `${timestamp}-${random}.${ext}`
}

// Get public URL for an image
export function getPublicUrl(key: string): string {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`
  }
  // Fallback to R2 dev URL format
  return `https://pub-${R2_ACCOUNT_ID}.r2.dev/${key}`
}

// Upload file to R2
export async function uploadToR2(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = "uploads"
): Promise<{ key: string; url: string }> {
  const key = `${folder}/${fileName}`

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000", // 1 year cache
    })
  )

  return {
    key,
    url: getPublicUrl(key),
  }
}

// Delete file from R2
export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  )
}

// Generate presigned URL for direct upload (optional, for large files)
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  folder: string = "uploads"
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const key = `${folder}/${fileName}`

  const uploadUrl = await getSignedUrl(
    r2Client,
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 3600 } // 1 hour
  )

  return {
    uploadUrl,
    key,
    publicUrl: getPublicUrl(key),
  }
}

// Extract key from URL
export function extractKeyFromUrl(url: string): string | null {
  if (!url) return null

  // Handle R2 public URL formats
  const r2Patterns = [
    /r2\.dev\/(.+)$/,
    /r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/,
  ]

  for (const pattern of r2Patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  // Handle custom domain - extract path after domain
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    return url.replace(`${R2_PUBLIC_URL}/`, "")
  }

  return null
}
