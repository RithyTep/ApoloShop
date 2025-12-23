import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/holidays - Get all holidays
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")

    let where = {}
    if (year) {
      const startDate = new Date(`${year}-01-01`)
      const endDate = new Date(`${year}-12-31`)
      where = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      }
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: "asc" },
    })

    return NextResponse.json({ holidays })
  } catch (error) {
    console.error("Get holidays error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/holidays - Create a new holiday
export async function POST(request: NextRequest) {
  try {
    const { date, nameEn, nameKh, isFullDay, openTime, closeTime } = await request.json()

    if (!date || !nameEn || !nameKh) {
      return NextResponse.json(
        { error: "date, nameEn, and nameKh are required" },
        { status: 400 }
      )
    }

    // Check if holiday already exists for this date
    const existingHoliday = await prisma.holiday.findFirst({
      where: { date: new Date(date) },
    })

    if (existingHoliday) {
      return NextResponse.json(
        { error: "A holiday already exists for this date" },
        { status: 400 }
      )
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: new Date(date),
        nameEn,
        nameKh,
        isFullDay: isFullDay ?? true,
        openTime: isFullDay ? null : openTime,
        closeTime: isFullDay ? null : closeTime,
      },
    })

    return NextResponse.json({ holiday }, { status: 201 })
  } catch (error) {
    console.error("Create holiday error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/holidays - Update a holiday
export async function PUT(request: NextRequest) {
  try {
    const { id, date, nameEn, nameKh, isFullDay, openTime, closeTime } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        nameEn,
        nameKh,
        isFullDay,
        openTime: isFullDay ? null : openTime,
        closeTime: isFullDay ? null : closeTime,
      },
    })

    return NextResponse.json({ holiday })
  } catch (error) {
    console.error("Update holiday error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/holidays - Delete a holiday
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    await prisma.holiday.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete holiday error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
