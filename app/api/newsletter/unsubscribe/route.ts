import { NextResponse } from "next/server"
import { unsubscribeFromNewsletter } from "@/lib/email-marketing"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.json(
      { error: "Invalid unsubscribe link" },
      { status: 400 }
    )
  }

  const result = await unsubscribeFromNewsletter(token)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    )
  }

  // Redirect to confirmation page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  return NextResponse.redirect(`${baseUrl}/unsubscribe?success=true`)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      )
    }

    const result = await unsubscribeFromNewsletter(token)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Unsubscribed successfully",
    })
  } catch (error) {
    console.error("[Newsletter Unsubscribe]", error)
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    )
  }
}
