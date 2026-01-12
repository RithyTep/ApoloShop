import { NextResponse } from "next/server"
import { subscribeToNewsletter } from "@/lib/email-marketing"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, source, language } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Get request metadata
    const headersList = await headers()
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] ||
                      headersList.get("x-real-ip") ||
                      "unknown"
    const userAgent = headersList.get("user-agent") || undefined

    const result = await subscribeToNewsletter(email, {
      name,
      source,
      language,
      ipAddress,
      userAgent,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Subscribed successfully",
    })
  } catch (error) {
    console.error("[Newsletter Subscribe]", error)
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    )
  }
}
