import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import type { Gender, FitType } from "@prisma/client"

// GET /api/size-profiles - Get customer size profile
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const customerId = searchParams.get("customerId")
  const guestId = searchParams.get("guestId")

  if (!customerId && !guestId) {
    return NextResponse.json(
      { error: "Either customerId or guestId is required" },
      { status: 400 }
    )
  }

  try {
    const where = customerId ? { customerId } : { guestId }
    const profile = await prisma.sizeProfile.findFirst({ where })

    if (!profile) {
      return NextResponse.json({ profile: null })
    }

    return NextResponse.json({
      profile: {
        ...profile,
        height: profile.height ? Number(profile.height) : null,
        weight: profile.weight ? Number(profile.weight) : null,
        chest: profile.chest ? Number(profile.chest) : null,
        waist: profile.waist ? Number(profile.waist) : null,
        hips: profile.hips ? Number(profile.hips) : null,
        inseam: profile.inseam ? Number(profile.inseam) : null,
        shoulder: profile.shoulder ? Number(profile.shoulder) : null,
        armLength: profile.armLength ? Number(profile.armLength) : null,
        footLength: profile.footLength ? Number(profile.footLength) : null,
        footWidth: profile.footWidth ? Number(profile.footWidth) : null,
        savedSizes: profile.savedSizes,
      },
    })
  } catch (error) {
    console.error("Error fetching size profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch size profile" },
      { status: 500 }
    )
  }
}

// POST /api/size-profiles - Create or update size profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      customerId,
      guestId,
      gender,
      height,
      weight,
      age,
      chest,
      waist,
      hips,
      inseam,
      shoulder,
      armLength,
      footLength,
      footWidth,
      preferredFit = "REGULAR" as FitType,
      savedSizes,
    } = body

    if (!customerId && !guestId) {
      return NextResponse.json(
        { error: "Either customerId or guestId is required" },
        { status: 400 }
      )
    }

    // Validate gender if provided
    if (gender) {
      const validGenders: Gender[] = ["MALE", "FEMALE", "UNISEX"]
      if (!validGenders.includes(gender)) {
        return NextResponse.json(
          { error: `Invalid gender. Must be one of: ${validGenders.join(", ")}` },
          { status: 400 }
        )
      }
    }

    // Validate fit type
    const validFitTypes: FitType[] = ["SLIM", "REGULAR", "RELAXED", "OVERSIZED"]
    if (!validFitTypes.includes(preferredFit)) {
      return NextResponse.json(
        { error: `Invalid fit type. Must be one of: ${validFitTypes.join(", ")}` },
        { status: 400 }
      )
    }

    // Check for existing profile
    const where = customerId ? { customerId } : { guestId }
    const existing = await prisma.sizeProfile.findFirst({ where })

    const profileData = {
      customerId,
      guestId,
      gender,
      height,
      weight,
      age,
      chest,
      waist,
      hips,
      inseam,
      shoulder,
      armLength,
      footLength,
      footWidth,
      preferredFit,
      savedSizes,
    }

    let profile
    if (existing) {
      // Update existing profile
      profile = await prisma.sizeProfile.update({
        where: { id: existing.id },
        data: profileData,
      })
    } else {
      // Create new profile
      profile = await prisma.sizeProfile.create({
        data: profileData,
      })
    }

    return NextResponse.json({
      message: existing ? "Size profile updated successfully" : "Size profile created successfully",
      profile: {
        ...profile,
        height: profile.height ? Number(profile.height) : null,
        weight: profile.weight ? Number(profile.weight) : null,
        chest: profile.chest ? Number(profile.chest) : null,
        waist: profile.waist ? Number(profile.waist) : null,
        hips: profile.hips ? Number(profile.hips) : null,
        inseam: profile.inseam ? Number(profile.inseam) : null,
        shoulder: profile.shoulder ? Number(profile.shoulder) : null,
        armLength: profile.armLength ? Number(profile.armLength) : null,
        footLength: profile.footLength ? Number(profile.footLength) : null,
        footWidth: profile.footWidth ? Number(profile.footWidth) : null,
        savedSizes: profile.savedSizes,
      },
    }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error("Error saving size profile:", error)
    return NextResponse.json(
      { error: "Failed to save size profile" },
      { status: 500 }
    )
  }
}

// PATCH /api/size-profiles - Save a specific size
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      customerId,
      guestId,
      category,  // e.g., "tops", "bottoms", "shoes"
      brand,     // Optional brand name
      size,      // The size to save
    } = body

    if (!customerId && !guestId) {
      return NextResponse.json(
        { error: "Either customerId or guestId is required" },
        { status: 400 }
      )
    }

    if (!category || !size) {
      return NextResponse.json(
        { error: "Category and size are required" },
        { status: 400 }
      )
    }

    // Get existing profile
    const where = customerId ? { customerId } : { guestId }
    const existing = await prisma.sizeProfile.findFirst({ where })

    const key = brand ? `brand:${brand}:${category}` : category
    const currentSizes = (existing?.savedSizes as Record<string, string>) || {}
    const newSavedSizes = { ...currentSizes, [key]: size }

    let profile
    if (existing) {
      profile = await prisma.sizeProfile.update({
        where: { id: existing.id },
        data: { savedSizes: newSavedSizes },
      })
    } else {
      profile = await prisma.sizeProfile.create({
        data: {
          customerId,
          guestId,
          savedSizes: newSavedSizes,
        },
      })
    }

    return NextResponse.json({
      message: "Size saved successfully",
      savedSizes: profile.savedSizes,
    })
  } catch (error) {
    console.error("Error saving size:", error)
    return NextResponse.json(
      { error: "Failed to save size" },
      { status: 500 }
    )
  }
}

// DELETE /api/size-profiles - Delete size profile
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const customerId = searchParams.get("customerId")
  const guestId = searchParams.get("guestId")

  if (!customerId && !guestId) {
    return NextResponse.json(
      { error: "Either customerId or guestId is required" },
      { status: 400 }
    )
  }

  try {
    const where = customerId ? { customerId } : { guestId }
    const existing = await prisma.sizeProfile.findFirst({ where })

    if (!existing) {
      return NextResponse.json(
        { error: "Size profile not found" },
        { status: 404 }
      )
    }

    await prisma.sizeProfile.delete({
      where: { id: existing.id },
    })

    return NextResponse.json({
      message: "Size profile deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting size profile:", error)
    return NextResponse.json(
      { error: "Failed to delete size profile" },
      { status: 500 }
    )
  }
}
