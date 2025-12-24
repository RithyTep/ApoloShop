import { NextRequest, NextResponse } from "next/server"
import { uploadToR2, generateFileName, deleteFromR2, extractKeyFromUrl } from "@/lib/r2"

// Allowed image types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]

// Max file size: 5MB
const MAX_SIZE = 5 * 1024 * 1024

// POST /api/upload - Upload image to R2
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folder = (formData.get("folder") as string) || "uploads"

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, AVIF" },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 5MB" },
        { status: 400 }
      )
    }

    // Convert to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Generate unique filename
    const fileName = generateFileName(file.name)

    // Upload to R2
    const result = await uploadToR2(buffer, fileName, file.type, folder)

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    )
  }
}

// DELETE /api/upload - Delete image from R2
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
