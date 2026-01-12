import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logSettingsAudit } from "@/lib/audit-service"

// GET /api/settings - Get all settings
export async function GET() {
  try {
    const settings = await prisma.setting.findMany()

    // Convert to object
    const settingsObject: Record<string, unknown> = {}
    for (const setting of settings) {
      settingsObject[setting.key] = setting.value
    }

    return NextResponse.json({ settings: settingsObject })
  } catch (error) {
    console.error("Get settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Update each setting
    const updates = Object.entries(body).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: value as object },
        create: { key, value: value as object },
      })
    )

    await Promise.all(updates)

    // Log audit for each setting change (non-blocking)
    const settingKeys = Object.keys(body)
    for (const key of settingKeys) {
      logSettingsAudit(key, undefined, undefined, {
        key,
        newValue: body[key],
      }, request)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
