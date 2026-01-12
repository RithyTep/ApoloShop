import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { processAbandonedCarts, processWelcomeSeries } from "@/lib/email-marketing"

/**
 * Email Marketing Cron Job
 * Processes abandoned cart recovery and welcome email series
 *
 * Should be called every hour via Vercel Cron or external scheduler
 * Set CRON_SECRET in environment variables for security
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const headersList = await headers()
    const authHeader = headersList.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Process abandoned carts
    const abandonedCartResults = await processAbandonedCarts()

    // Process welcome series
    const welcomeResults = await processWelcomeSeries()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      abandonedCarts: abandonedCartResults,
      welcomeSeries: welcomeResults,
    })
  } catch (error) {
    console.error("[Email Cron]", error)
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility with cron services
export async function POST(request: Request) {
  return GET(request)
}
