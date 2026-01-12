import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"

/**
 * Facebook Conversions API endpoint
 * Server-side event tracking for improved conversion attribution
 *
 * POST /api/conversions/facebook
 * Body: { eventName, eventData, userData, customData }
 */

// Facebook Conversions API types
interface FBUserData {
  em?: string[] // hashed email
  ph?: string[] // hashed phone
  fn?: string[] // hashed first name
  ln?: string[] // hashed last name
  ct?: string[] // hashed city
  st?: string[] // hashed state
  zp?: string[] // hashed zip code
  country?: string[] // hashed country
  external_id?: string[] // hashed external ID
  client_ip_address?: string
  client_user_agent?: string
  fbc?: string // Facebook click ID
  fbp?: string // Facebook browser ID
}

interface FBCustomData {
  value?: number
  currency?: string
  content_name?: string
  content_category?: string
  content_ids?: string[]
  content_type?: string
  contents?: Array<{
    id: string
    quantity: number
    item_price?: number
  }>
  num_items?: number
  order_id?: string
  search_string?: string
  status?: string
}

interface FBServerEvent {
  event_name: string
  event_time: number
  event_id?: string
  event_source_url?: string
  action_source: "website" | "app" | "email" | "phone_call" | "chat" | "physical_store" | "system_generated" | "other"
  user_data: FBUserData
  custom_data?: FBCustomData
  opt_out?: boolean
}

interface ConversionRequest {
  eventName: string
  eventId?: string
  eventSourceUrl?: string
  userData?: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
    externalId?: string
    fbc?: string
    fbp?: string
  }
  customData?: {
    value?: number
    currency?: string
    contentName?: string
    contentCategory?: string
    contentIds?: string[]
    contentType?: string
    contents?: Array<{ id: string; quantity: number; itemPrice?: number }>
    numItems?: number
    orderId?: string
    searchString?: string
    status?: string
  }
}

// Hash function for user data (SHA-256)
function hashData(value: string | undefined): string | undefined {
  if (!value) return undefined
  return createHash("sha256")
    .update(value.toLowerCase().trim())
    .digest("hex")
}

// Normalize and hash phone number
function hashPhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined
  // Remove all non-digits except leading +
  const normalized = phone.replace(/[^\d+]/g, "")
  return hashData(normalized)
}

// Get FB Pixel settings from database
async function getFBPixelSettings(): Promise<{
  enabled: boolean
  pixelId: string
  enableConversionsApi: boolean
  accessToken: string
  testEventCode: string
} | null> {
  try {
    const settings = await prisma.settings.findFirst()
    if (!settings?.settings) return null

    const settingsObj = settings.settings as Record<string, unknown>
    const fbPixel = settingsObj.fbPixel as Record<string, unknown> | undefined

    if (!fbPixel) return null

    return {
      enabled: fbPixel.enabled as boolean ?? false,
      pixelId: fbPixel.pixelId as string ?? "",
      enableConversionsApi: fbPixel.enableConversionsApi as boolean ?? false,
      accessToken: fbPixel.accessToken as string ?? "",
      testEventCode: fbPixel.testEventCode as string ?? "",
    }
  } catch (error) {
    console.error("[FB Conversions API] Error fetching settings:", error)
    return null
  }
}

// Send event to Facebook Conversions API
async function sendToFacebookAPI(
  pixelId: string,
  accessToken: string,
  events: FBServerEvent[],
  testEventCode?: string
): Promise<{ success: boolean; response?: unknown; error?: string }> {
  const apiVersion = "v18.0"
  const url = `https://graph.facebook.com/${apiVersion}/${pixelId}/events`

  const body: Record<string, unknown> = {
    data: events,
    access_token: accessToken,
  }

  // Add test event code if provided (for testing without affecting real data)
  if (testEventCode) {
    body.test_event_code = testEventCode
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[FB Conversions API] Error response:", data)
      return {
        success: false,
        error: data.error?.message || "Unknown error from Facebook API",
      }
    }

    return { success: true, response: data }
  } catch (error) {
    console.error("[FB Conversions API] Request failed:", error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get FB Pixel settings
    const fbSettings = await getFBPixelSettings()

    if (!fbSettings?.enabled) {
      return NextResponse.json(
        { error: "Facebook Pixel is not enabled" },
        { status: 400 }
      )
    }

    if (!fbSettings.enableConversionsApi) {
      return NextResponse.json(
        { error: "Conversions API is not enabled" },
        { status: 400 }
      )
    }

    if (!fbSettings.pixelId || !fbSettings.accessToken) {
      return NextResponse.json(
        { error: "Pixel ID or Access Token not configured" },
        { status: 400 }
      )
    }

    // Parse request body
    const body: ConversionRequest = await request.json()

    if (!body.eventName) {
      return NextResponse.json(
        { error: "Event name is required" },
        { status: 400 }
      )
    }

    // Get client IP and user agent from request headers
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Build user data with hashed values
    const userData: FBUserData = {
      client_ip_address: clientIp,
      client_user_agent: userAgent,
    }

    if (body.userData) {
      const ud = body.userData
      if (ud.email) userData.em = [hashData(ud.email)!]
      if (ud.phone) userData.ph = [hashPhone(ud.phone)!]
      if (ud.firstName) userData.fn = [hashData(ud.firstName)!]
      if (ud.lastName) userData.ln = [hashData(ud.lastName)!]
      if (ud.city) userData.ct = [hashData(ud.city)!]
      if (ud.state) userData.st = [hashData(ud.state)!]
      if (ud.zipCode) userData.zp = [hashData(ud.zipCode)!]
      if (ud.country) userData.country = [hashData(ud.country)!]
      if (ud.externalId) userData.external_id = [hashData(ud.externalId)!]
      if (ud.fbc) userData.fbc = ud.fbc
      if (ud.fbp) userData.fbp = ud.fbp
    }

    // Build custom data
    const customData: FBCustomData = {}
    if (body.customData) {
      const cd = body.customData
      if (cd.value !== undefined) customData.value = cd.value
      if (cd.currency) customData.currency = cd.currency
      if (cd.contentName) customData.content_name = cd.contentName
      if (cd.contentCategory) customData.content_category = cd.contentCategory
      if (cd.contentIds) customData.content_ids = cd.contentIds
      if (cd.contentType) customData.content_type = cd.contentType
      if (cd.contents) {
        customData.contents = cd.contents.map(c => ({
          id: c.id,
          quantity: c.quantity,
          item_price: c.itemPrice,
        }))
      }
      if (cd.numItems !== undefined) customData.num_items = cd.numItems
      if (cd.orderId) customData.order_id = cd.orderId
      if (cd.searchString) customData.search_string = cd.searchString
      if (cd.status) customData.status = cd.status
    }

    // Build server event
    const serverEvent: FBServerEvent = {
      event_name: body.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: body.eventId || `${body.eventName}_${Date.now()}`,
      event_source_url: body.eventSourceUrl || request.headers.get("referer") || undefined,
      action_source: "website",
      user_data: userData,
      custom_data: Object.keys(customData).length > 0 ? customData : undefined,
    }

    // Send to Facebook Conversions API
    const result = await sendToFacebookAPI(
      fbSettings.pixelId,
      fbSettings.accessToken,
      [serverEvent],
      fbSettings.testEventCode || undefined
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      eventName: body.eventName,
      eventId: serverEvent.event_id,
      response: result.response,
    })
  } catch (error) {
    console.error("[FB Conversions API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  const fbSettings = await getFBPixelSettings()

  return NextResponse.json({
    enabled: fbSettings?.enabled ?? false,
    conversionsApiEnabled: fbSettings?.enableConversionsApi ?? false,
    pixelConfigured: !!fbSettings?.pixelId,
    accessTokenConfigured: !!fbSettings?.accessToken,
  })
}
