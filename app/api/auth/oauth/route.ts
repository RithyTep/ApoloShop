/**
 * OAuth Providers List API
 * GET /api/auth/oauth - List available OAuth providers
 */

import { NextResponse } from "next/server"
import { getAvailableProviders } from "@/lib/oauth"

export async function GET() {
  try {
    const providers = getAvailableProviders()

    return NextResponse.json({
      providers: providers.filter((p) => p.enabled),
      allProviders: providers,
    })
  } catch (error) {
    console.error("OAuth providers error:", error)
    return NextResponse.json(
      { error: "Failed to get OAuth providers" },
      { status: 500 }
    )
  }
}
