/**
 * Social Accounts Management API
 * GET /api/auth/social-accounts - List linked social accounts
 * DELETE /api/auth/social-accounts - Unlink a social account
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware"
import {
  getUserSocialAccounts,
  getCustomerSocialAccounts,
  unlinkSocialAccount,
} from "@/lib/oauth-service"

const unlinkSchema = z.object({
  provider: z.enum(["google", "facebook"]),
  customerId: z.string().optional(),
})

/**
 * GET - List linked social accounts for the current user
 */
async function handleGet(request: AuthenticatedRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get("customerId")

    let accounts

    if (customerId) {
      // Get customer social accounts
      accounts = await getCustomerSocialAccounts(customerId)
    } else if (request.user) {
      // Get user social accounts
      accounts = await getUserSocialAccounts(request.user.userId)
    } else {
      return NextResponse.json(
        { error: "No user or customer ID provided" },
        { status: 400 }
      )
    }

    // Format response
    const formattedAccounts = accounts.map((account) => ({
      id: account.id,
      provider: account.provider.toLowerCase(),
      providerUserId: account.providerUserId,
      email: account.email,
      name: account.name,
      avatarUrl: account.avatarUrl,
      connectedAt: account.createdAt,
    }))

    return NextResponse.json({
      accounts: formattedAccounts,
      availableProviders: ["google", "facebook"],
    })
  } catch (error) {
    console.error("Get social accounts error:", error)
    return NextResponse.json(
      { error: "Failed to get social accounts" },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Unlink a social account
 */
async function handleDelete(request: AuthenticatedRequest) {
  try {
    const body = await request.json()

    // Validate input
    const result = unlinkSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { provider, customerId } = result.data

    let unlinkResult

    if (customerId) {
      unlinkResult = await unlinkSocialAccount(provider, undefined, customerId)
    } else if (request.user) {
      unlinkResult = await unlinkSocialAccount(provider, request.user.userId)
    } else {
      return NextResponse.json(
        { error: "No user or customer ID provided" },
        { status: 400 }
      )
    }

    if (!unlinkResult.success) {
      return NextResponse.json(
        { error: unlinkResult.error, code: unlinkResult.errorCode },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${provider} account unlinked successfully`,
    })
  } catch (error) {
    console.error("Unlink social account error:", error)
    return NextResponse.json(
      { error: "Failed to unlink social account" },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handleGet)
export const DELETE = withAuth(handleDelete)
