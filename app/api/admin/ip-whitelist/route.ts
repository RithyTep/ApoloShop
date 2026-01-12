/**
 * Admin IP Whitelist API
 * GET - Get user's IP whitelist configuration
 * POST - Update user's IP whitelist
 * DELETE - Clear user's IP whitelist
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  withAuth,
  AuthenticatedRequest,
  getUserAllowedIPs,
  updateUserAllowedIPs,
} from "@/lib/auth-middleware"
import { validateIPList, formatAllowedIPs } from "@/lib/ip-whitelist"
import { isSuperAdmin } from "@/lib/rbac"

/**
 * GET /api/admin/ip-whitelist
 * Get IP whitelist for a user
 * Query params:
 *   - userId: Target user ID (required for admin viewing other users, optional for self)
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userRole = request.user.role
    const currentUserId = request.user.id

    // Only admin and super_admin can access
    if (userRole !== "super_admin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get("userId") || currentUserId

    // Non-super-admins can only view their own IP whitelist
    if (targetUserId !== currentUserId && !isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: "Only super admins can view other users' IP whitelists" },
        { status: 403 }
      )
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
        allowedIPs: true,
        role: {
          select: { name: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const allowedIPs = user.allowedIPs as string[] | null

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
      },
      ipWhitelist: {
        enabled: allowedIPs !== null && allowedIPs.length > 0,
        allowedIPs: allowedIPs || [],
        display: formatAllowedIPs(allowedIPs),
      },
      isSuperAdmin: isSuperAdmin(user.role.name),
      superAdminNote: isSuperAdmin(user.role.name)
        ? "Super admins bypass IP restrictions"
        : null,
    })
  } catch (error) {
    console.error("[Admin IP Whitelist API] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

/**
 * POST /api/admin/ip-whitelist
 * Update IP whitelist for a user
 * Body:
 *   - userId: Target user ID (required for admin updating other users)
 *   - allowedIPs: Array of IP addresses and/or CIDR ranges
 */
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userRole = request.user.role
    const currentUserId = request.user.id

    // Only admin and super_admin can update
    if (userRole !== "super_admin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { userId: targetUserId, allowedIPs } = body

    // If no userId provided, default to current user
    const effectiveUserId = targetUserId || currentUserId

    // Non-super-admins can only update their own IP whitelist
    if (effectiveUserId !== currentUserId && !isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: "Only super admins can modify other users' IP whitelists" },
        { status: 403 }
      )
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: { select: { name: true } },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Validate allowedIPs is an array
    if (!Array.isArray(allowedIPs)) {
      return NextResponse.json(
        { error: "allowedIPs must be an array" },
        { status: 400 }
      )
    }

    // Validate IP/CIDR entries
    const validation = validateIPList(allowedIPs)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Invalid IP addresses or CIDR ranges",
          invalidEntries: validation.invalidEntries,
        },
        { status: 400 }
      )
    }

    // Filter out empty strings and normalize
    const normalizedIPs = allowedIPs
      .map((ip: string) => ip.trim())
      .filter((ip: string) => ip.length > 0)

    // Update user's IP whitelist
    const success = await updateUserAllowedIPs(
      effectiveUserId,
      normalizedIPs.length > 0 ? normalizedIPs : null
    )

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update IP whitelist" },
        { status: 500 }
      )
    }

    // Log audit entry
    try {
      await prisma.auditLog.create({
        data: {
          userId: currentUserId,
          userName: request.user.name,
          action: "UPDATE",
          resource: "user_ip_whitelist",
          resourceId: effectiveUserId,
          details: {
            targetUserId: effectiveUserId,
            targetUserEmail: targetUser.email,
            newAllowedIPs: normalizedIPs,
            ipCount: normalizedIPs.length,
          },
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
          userAgent: request.headers.get("user-agent"),
        },
      })
    } catch (auditError) {
      console.error("[Admin IP Whitelist API] Failed to log audit:", auditError)
    }

    return NextResponse.json({
      success: true,
      message: `IP whitelist updated for ${targetUser.email}`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
      },
      ipWhitelist: {
        enabled: normalizedIPs.length > 0,
        allowedIPs: normalizedIPs,
        display: formatAllowedIPs(normalizedIPs),
      },
      note: isSuperAdmin(targetUser.role.name)
        ? "Note: Super admins bypass IP restrictions"
        : null,
    })
  } catch (error) {
    console.error("[Admin IP Whitelist API] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

/**
 * DELETE /api/admin/ip-whitelist
 * Clear IP whitelist for a user (allow all IPs)
 * Query params:
 *   - userId: Target user ID
 */
export const DELETE = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userRole = request.user.role
    const currentUserId = request.user.id

    // Only admin and super_admin can delete
    if (userRole !== "super_admin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get("userId") || currentUserId

    // Non-super-admins can only clear their own IP whitelist
    if (targetUserId !== currentUserId && !isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: "Only super admins can clear other users' IP whitelists" },
        { status: 403 }
      )
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
        allowedIPs: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const previousIPs = targetUser.allowedIPs as string[] | null

    // Clear IP whitelist
    const success = await updateUserAllowedIPs(targetUserId, null)

    if (!success) {
      return NextResponse.json(
        { error: "Failed to clear IP whitelist" },
        { status: 500 }
      )
    }

    // Log audit entry
    try {
      await prisma.auditLog.create({
        data: {
          userId: currentUserId,
          userName: request.user.name,
          action: "DELETE",
          resource: "user_ip_whitelist",
          resourceId: targetUserId,
          details: {
            targetUserId,
            targetUserEmail: targetUser.email,
            previousAllowedIPs: previousIPs || [],
            action: "cleared",
          },
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
          userAgent: request.headers.get("user-agent"),
        },
      })
    } catch (auditError) {
      console.error("[Admin IP Whitelist API] Failed to log audit:", auditError)
    }

    return NextResponse.json({
      success: true,
      message: `IP whitelist cleared for ${targetUser.email}. All IPs are now allowed.`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
      },
    })
  } catch (error) {
    console.error("[Admin IP Whitelist API] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
