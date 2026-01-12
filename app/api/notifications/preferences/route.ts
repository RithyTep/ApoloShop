import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Validation schemas
const updatePreferenceSchema = z.object({
  channel: z.enum(["TELEGRAM", "EMAIL", "SMS"]),
  enabled: z.boolean().optional(),
  telegramChatId: z.string().optional(),
  orderConfirmation: z.boolean().optional(),
  orderPreparing: z.boolean().optional(),
  orderReady: z.boolean().optional(),
  orderCompleted: z.boolean().optional(),
  orderCancelled: z.boolean().optional(),
})

const bulkUpdateSchema = z.object({
  preferences: z.array(updatePreferenceSchema),
})

/**
 * GET /api/notifications/preferences
 * Get notification preferences for a customer
 * Query params: customerId (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, email: true, phone: true },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Get preferences
    const preferences = await prisma.notificationPreference.findMany({
      where: { customerId },
    })

    // Return with customer info
    return NextResponse.json({
      customerId,
      email: customer.email,
      phone: customer.phone,
      preferences,
    })
  } catch (error) {
    console.error("Get notification preferences error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications/preferences
 * Create or update notification preferences for a customer
 * Body: { customerId, channel, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, ...preferenceData } = body

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      )
    }

    // Validate preference data
    const result = updatePreferenceSchema.safeParse(preferenceData)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { channel, ...updates } = result.data

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Upsert the preference
    const preference = await prisma.notificationPreference.upsert({
      where: {
        customerId_channel: {
          customerId,
          channel,
        },
      },
      create: {
        customerId,
        channel,
        ...updates,
      },
      update: updates,
    })

    return NextResponse.json(preference)
  } catch (error) {
    console.error("Update notification preference error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications/preferences
 * Bulk update notification preferences
 * Body: { customerId, preferences: [{ channel, enabled, ... }] }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, preferences } = body

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      )
    }

    // Validate preferences array
    const result = bulkUpdateSchema.safeParse({ preferences })
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Update each preference
    const updatedPreferences = await Promise.all(
      result.data.preferences.map(async ({ channel, ...updates }) => {
        return prisma.notificationPreference.upsert({
          where: {
            customerId_channel: {
              customerId,
              channel,
            },
          },
          create: {
            customerId,
            channel,
            ...updates,
          },
          update: updates,
        })
      })
    )

    return NextResponse.json({
      customerId,
      preferences: updatedPreferences,
    })
  } catch (error) {
    console.error("Bulk update notification preferences error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/preferences
 * Delete a notification preference
 * Query params: customerId, channel
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")
    const channel = searchParams.get("channel") as "TELEGRAM" | "EMAIL" | "SMS" | null

    if (!customerId || !channel) {
      return NextResponse.json(
        { error: "customerId and channel are required" },
        { status: 400 }
      )
    }

    // Delete the preference
    await prisma.notificationPreference.delete({
      where: {
        customerId_channel: {
          customerId,
          channel,
        },
      },
    }).catch(() => {
      // Ignore if doesn't exist
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete notification preference error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
