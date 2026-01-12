import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sanitizeString } from "@/lib/validation"

// Validation schema for shipping address
const shippingAddressSchema = z.object({
  customerId: z.string().optional(),
  guestId: z.string().optional(),
  label: z.string().max(50).optional(),
  fullName: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  province: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  commune: z.string().max(100).optional(),
  addressLine: z.string().min(1).max(500),
  landmark: z.string().max(200).optional(),
  isDefault: z.boolean().optional(),
})

// GET - Fetch shipping addresses for a customer or guest
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")
    const guestId = searchParams.get("guestId")
    const phone = searchParams.get("phone")

    if (!customerId && !guestId && !phone) {
      return NextResponse.json(
        { error: "Either customerId, guestId, or phone is required" },
        { status: 400 }
      )
    }

    // Build where clause
    const whereClause: Record<string, unknown> = {}

    if (customerId) {
      whereClause.customerId = customerId
    } else if (guestId) {
      whereClause.guestId = guestId
    } else if (phone) {
      // Find customer by phone and get their addresses
      const customer = await prisma.customer.findUnique({
        where: { phone },
        select: { id: true },
      })

      if (customer) {
        whereClause.customerId = customer.id
      } else {
        // Check for guest addresses with this phone
        whereClause.phone = phone
      }
    }

    const addresses = await prisma.shippingAddress.findMany({
      where: whereClause,
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error("Error fetching shipping addresses:", error)
    return NextResponse.json(
      { error: "Failed to fetch shipping addresses" },
      { status: 500 }
    )
  }
}

// POST - Create a new shipping address
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = shippingAddressSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Sanitize string inputs
    const sanitizedData = {
      customerId: data.customerId,
      guestId: data.guestId,
      label: data.label ? sanitizeString(data.label) : null,
      fullName: sanitizeString(data.fullName),
      phone: sanitizeString(data.phone),
      province: data.province ? sanitizeString(data.province) : null,
      district: data.district ? sanitizeString(data.district) : null,
      commune: data.commune ? sanitizeString(data.commune) : null,
      addressLine: sanitizeString(data.addressLine),
      landmark: data.landmark ? sanitizeString(data.landmark) : null,
      isDefault: data.isDefault ?? false,
    }

    // If setting as default, unset other defaults first
    if (sanitizedData.isDefault && (sanitizedData.customerId || sanitizedData.guestId)) {
      await prisma.shippingAddress.updateMany({
        where: {
          OR: [
            sanitizedData.customerId ? { customerId: sanitizedData.customerId } : {},
            sanitizedData.guestId ? { guestId: sanitizedData.guestId } : {},
          ].filter((o) => Object.keys(o).length > 0),
        },
        data: { isDefault: false },
      })
    }

    const address = await prisma.shippingAddress.create({
      data: sanitizedData,
    })

    return NextResponse.json({ address }, { status: 201 })
  } catch (error) {
    console.error("Error creating shipping address:", error)
    return NextResponse.json(
      { error: "Failed to create shipping address" },
      { status: 500 }
    )
  }
}

// PUT - Update a shipping address
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Address ID is required" },
        { status: 400 }
      )
    }

    const validation = shippingAddressSchema.partial().safeParse(updateData)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Sanitize string inputs
    const sanitizedData: Record<string, unknown> = {}
    if (data.label !== undefined) sanitizedData.label = data.label ? sanitizeString(data.label) : null
    if (data.fullName !== undefined) sanitizedData.fullName = sanitizeString(data.fullName)
    if (data.phone !== undefined) sanitizedData.phone = sanitizeString(data.phone)
    if (data.province !== undefined) sanitizedData.province = data.province ? sanitizeString(data.province) : null
    if (data.district !== undefined) sanitizedData.district = data.district ? sanitizeString(data.district) : null
    if (data.commune !== undefined) sanitizedData.commune = data.commune ? sanitizeString(data.commune) : null
    if (data.addressLine !== undefined) sanitizedData.addressLine = sanitizeString(data.addressLine)
    if (data.landmark !== undefined) sanitizedData.landmark = data.landmark ? sanitizeString(data.landmark) : null
    if (data.isDefault !== undefined) sanitizedData.isDefault = data.isDefault

    // Get the address to check ownership
    const existingAddress = await prisma.shippingAddress.findUnique({
      where: { id },
    })

    if (!existingAddress) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      )
    }

    // If setting as default, unset other defaults first
    if (sanitizedData.isDefault === true) {
      const whereClause: Record<string, unknown> = { id: { not: id } }
      if (existingAddress.customerId) {
        whereClause.customerId = existingAddress.customerId
      } else if (existingAddress.guestId) {
        whereClause.guestId = existingAddress.guestId
      }

      await prisma.shippingAddress.updateMany({
        where: whereClause,
        data: { isDefault: false },
      })
    }

    const address = await prisma.shippingAddress.update({
      where: { id },
      data: sanitizedData,
    })

    return NextResponse.json({ address })
  } catch (error) {
    console.error("Error updating shipping address:", error)
    return NextResponse.json(
      { error: "Failed to update shipping address" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a shipping address
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Address ID is required" },
        { status: 400 }
      )
    }

    await prisma.shippingAddress.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting shipping address:", error)
    return NextResponse.json(
      { error: "Failed to delete shipping address" },
      { status: 500 }
    )
  }
}
