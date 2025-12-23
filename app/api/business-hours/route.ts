import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Default business hours (Mon-Sat 9am-9pm, Sunday closed)
const DEFAULT_HOURS = [
  { dayOfWeek: 0, openTime: null, closeTime: null, isOpen: false }, // Sunday
  { dayOfWeek: 1, openTime: "09:00", closeTime: "21:00", isOpen: true }, // Monday
  { dayOfWeek: 2, openTime: "09:00", closeTime: "21:00", isOpen: true }, // Tuesday
  { dayOfWeek: 3, openTime: "09:00", closeTime: "21:00", isOpen: true }, // Wednesday
  { dayOfWeek: 4, openTime: "09:00", closeTime: "21:00", isOpen: true }, // Thursday
  { dayOfWeek: 5, openTime: "09:00", closeTime: "21:00", isOpen: true }, // Friday
  { dayOfWeek: 6, openTime: "09:00", closeTime: "21:00", isOpen: true }, // Saturday
]

// GET /api/business-hours - Get all business hours
export async function GET() {
  try {
    let hours = await prisma.businessHours.findMany({
      orderBy: { dayOfWeek: "asc" },
    })

    // If no hours exist, return defaults
    if (hours.length === 0) {
      return NextResponse.json({ hours: DEFAULT_HOURS, isDefault: true })
    }

    return NextResponse.json({ hours, isDefault: false })
  } catch (error) {
    console.error("Get business hours error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/business-hours - Update business hours
export async function PUT(request: NextRequest) {
  try {
    const { hours } = await request.json()

    if (!hours || !Array.isArray(hours) || hours.length !== 7) {
      return NextResponse.json(
        { error: "Hours must be an array of 7 days (0-6)" },
        { status: 400 }
      )
    }

    // Validate each day
    for (const day of hours) {
      if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
        return NextResponse.json(
          { error: "dayOfWeek must be 0-6" },
          { status: 400 }
        )
      }
      if (day.isOpen && (!day.openTime || !day.closeTime)) {
        return NextResponse.json(
          { error: "Open days must have openTime and closeTime" },
          { status: 400 }
        )
      }
    }

    // Upsert all 7 days
    const results = await Promise.all(
      hours.map((day: {
        dayOfWeek: number
        openTime: string | null
        closeTime: string | null
        isOpen: boolean
      }) =>
        prisma.businessHours.upsert({
          where: { dayOfWeek: day.dayOfWeek },
          update: {
            openTime: day.isOpen ? day.openTime : null,
            closeTime: day.isOpen ? day.closeTime : null,
            isOpen: day.isOpen,
          },
          create: {
            dayOfWeek: day.dayOfWeek,
            openTime: day.isOpen ? day.openTime : null,
            closeTime: day.isOpen ? day.closeTime : null,
            isOpen: day.isOpen,
          },
        })
      )
    )

    return NextResponse.json({ hours: results, success: true })
  } catch (error) {
    console.error("Update business hours error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/business-hours/status - Get current open/closed status
export async function POST() {
  try {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0-6
    const currentTime = now.toTimeString().slice(0, 5) // "HH:MM"

    // Check for holiday today
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const holiday = await prisma.holiday.findFirst({
      where: { date: today },
    })

    if (holiday) {
      if (holiday.isFullDay) {
        return NextResponse.json({
          isOpen: false,
          reason: "holiday",
          holiday: {
            nameEn: holiday.nameEn,
            nameKh: holiday.nameKh,
          },
        })
      }
      // Holiday with special hours
      const isOpen =
        holiday.openTime &&
        holiday.closeTime &&
        currentTime >= holiday.openTime &&
        currentTime < holiday.closeTime

      return NextResponse.json({
        isOpen,
        reason: "holiday_hours",
        holiday: {
          nameEn: holiday.nameEn,
          nameKh: holiday.nameKh,
          openTime: holiday.openTime,
          closeTime: holiday.closeTime,
        },
      })
    }

    // Check regular business hours
    const hours = await prisma.businessHours.findUnique({
      where: { dayOfWeek },
    })

    if (!hours) {
      // Use default hours
      const defaultDay = DEFAULT_HOURS[dayOfWeek]
      const isOpen =
        defaultDay.isOpen &&
        defaultDay.openTime &&
        defaultDay.closeTime &&
        currentTime >= defaultDay.openTime &&
        currentTime < defaultDay.closeTime

      return NextResponse.json({
        isOpen,
        reason: "regular",
        hours: defaultDay,
      })
    }

    const isOpen =
      hours.isOpen &&
      hours.openTime &&
      hours.closeTime &&
      currentTime >= hours.openTime &&
      currentTime < hours.closeTime

    return NextResponse.json({
      isOpen,
      reason: "regular",
      hours: {
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        isOpen: hours.isOpen,
      },
    })
  } catch (error) {
    console.error("Get status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
