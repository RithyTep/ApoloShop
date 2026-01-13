import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"
import { prisma } from "@/lib/prisma"

// GET /api/store-pickup/qr - Generate QR code image for pickup verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const pickupId = searchParams.get("pickupId")

    if (!code && !pickupId) {
      return NextResponse.json(
        { error: "Either code or pickupId is required" },
        { status: 400 }
      )
    }

    let qrData: string

    if (code) {
      // Direct code provided - verify it exists
      const pickup = await prisma.storePickup.findUnique({
        where: { verificationCode: code.toUpperCase() },
        select: { qrCodeData: true, verificationCode: true },
      })

      if (!pickup) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 404 }
        )
      }

      qrData = pickup.qrCodeData || pickup.verificationCode
    } else if (pickupId) {
      // Pickup ID provided
      const pickup = await prisma.storePickup.findUnique({
        where: { id: pickupId },
        select: { qrCodeData: true, verificationCode: true },
      })

      if (!pickup) {
        return NextResponse.json(
          { error: "Pickup not found" },
          { status: 404 }
        )
      }

      qrData = pickup.qrCodeData || pickup.verificationCode
    } else {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      )
    }

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(qrData, {
      type: "png",
      width: 300,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    // Return as image
    return new NextResponse(qrBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error("QR code generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    )
  }
}
