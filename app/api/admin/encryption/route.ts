/**
 * Admin Encryption Management API
 * GET - Get encryption status and statistics
 * POST - Trigger key rotation for encrypted data
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware"
import {
  getEncryptionStatus,
  isKeyRotationNeeded,
  reEncrypt,
  isEncrypted,
  ENCRYPTED_FIELDS,
  KeyRotationResult,
  KeyRotationSummary,
} from "@/lib/encryption"

/**
 * GET /api/admin/encryption
 * Get encryption status and statistics
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Check super admin permissions only
    const userRole = request.auth.user.role
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden - Super admin only" }, { status: 403 })
    }

    const status = getEncryptionStatus()
    const rotationNeeded = isKeyRotationNeeded()

    // Get record counts for encrypted models
    const modelStats: Record<string, { total: number; encrypted: number }> = {}

    for (const model of Object.keys(ENCRYPTED_FIELDS)) {
      try {
        let total = 0
        let encrypted = 0

        if (model === "Customer") {
          const customers = await prisma.customer.findMany({
            select: { phone: true, email: true },
          })
          total = customers.length
          encrypted = customers.filter(
            (c) =>
              (c.phone && isEncrypted(c.phone)) ||
              (c.email && isEncrypted(c.email))
          ).length
        } else if (model === "Payment") {
          const payments = await prisma.payment.findMany({
            select: { transactionId: true },
          })
          total = payments.length
          encrypted = payments.filter(
            (p) => p.transactionId && isEncrypted(p.transactionId)
          ).length
        }

        modelStats[model] = { total, encrypted }
      } catch (error) {
        console.error(`[Encryption API] Error getting stats for ${model}:`, error)
        modelStats[model] = { total: 0, encrypted: 0 }
      }
    }

    return NextResponse.json({
      status,
      rotationNeeded,
      modelStats,
    })
  } catch (error) {
    console.error("[Encryption API] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

/**
 * POST /api/admin/encryption
 * Trigger key rotation for encrypted data
 * Body: { action: "rotate" }
 */
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Check super admin permissions only
    const userRole = request.auth.user.role
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden - Super admin only" }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action !== "rotate") {
      return NextResponse.json(
        { error: "Invalid action. Supported actions: rotate" },
        { status: 400 }
      )
    }

    if (!isKeyRotationNeeded()) {
      return NextResponse.json(
        { error: "Key rotation not needed - no previous key configured" },
        { status: 400 }
      )
    }

    const startedAt = new Date()
    const results: KeyRotationResult[] = []
    let totalRotated = 0
    let totalErrors = 0

    // Rotate Customer records
    const customerResult = await rotateCustomerEncryption()
    results.push(customerResult)
    totalRotated += customerResult.rotatedRecords
    totalErrors += customerResult.errors.length

    // Rotate Payment records
    const paymentResult = await rotatePaymentEncryption()
    results.push(paymentResult)
    totalRotated += paymentResult.rotatedRecords
    totalErrors += paymentResult.errors.length

    const completedAt = new Date()

    const summary: KeyRotationSummary = {
      success: totalErrors === 0,
      startedAt,
      completedAt,
      results,
      totalRotated,
      totalErrors,
    }

    // Log audit
    try {
      await prisma.auditLog.create({
        data: {
          userId: request.auth.user.id,
          userName: request.auth.user.email,
          action: "UPDATE",
          resource: "encryption",
          resourceId: "key-rotation",
          details: {
            action: "key_rotation",
            totalRotated,
            totalErrors,
            duration: completedAt.getTime() - startedAt.getTime(),
          },
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          userAgent: request.headers.get("user-agent"),
        },
      })
    } catch (auditError) {
      console.error("[Encryption API] Failed to log audit:", auditError)
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error("[Encryption API] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

/**
 * Rotate encryption for Customer records
 */
async function rotateCustomerEncryption(): Promise<KeyRotationResult> {
  const result: KeyRotationResult = {
    model: "Customer",
    totalRecords: 0,
    rotatedRecords: 0,
    skippedRecords: 0,
    errors: [],
  }

  try {
    const customers = await prisma.customer.findMany({
      select: { id: true, phone: true, email: true, notes: true },
    })
    result.totalRecords = customers.length

    for (const customer of customers) {
      try {
        const updates: Record<string, string> = {}
        let needsUpdate = false

        // Check and re-encrypt each field
        if (customer.phone) {
          const rotated = reEncrypt(customer.phone)
          if (rotated) {
            updates.phone = rotated
            needsUpdate = true
          }
        }
        if (customer.email) {
          const rotated = reEncrypt(customer.email)
          if (rotated) {
            updates.email = rotated
            needsUpdate = true
          }
        }
        if (customer.notes) {
          const rotated = reEncrypt(customer.notes)
          if (rotated) {
            updates.notes = rotated
            needsUpdate = true
          }
        }

        if (needsUpdate) {
          // Direct update to bypass middleware encryption
          await prisma.$executeRaw`
            UPDATE apolo.customers
            SET phone = ${updates.phone || customer.phone},
                email = ${updates.email || customer.email},
                notes = ${updates.notes || customer.notes}
            WHERE id = ${customer.id}
          `
          result.rotatedRecords++
        } else {
          result.skippedRecords++
        }
      } catch (error) {
        result.errors.push(`Customer ${customer.id}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }
  } catch (error) {
    result.errors.push(`Failed to fetch customers: ${error instanceof Error ? error.message : "Unknown error"}`)
  }

  return result
}

/**
 * Rotate encryption for Payment records
 */
async function rotatePaymentEncryption(): Promise<KeyRotationResult> {
  const result: KeyRotationResult = {
    model: "Payment",
    totalRecords: 0,
    rotatedRecords: 0,
    skippedRecords: 0,
    errors: [],
  }

  try {
    const payments = await prisma.payment.findMany({
      select: { id: true, transactionId: true },
    })
    result.totalRecords = payments.length

    for (const payment of payments) {
      try {
        if (payment.transactionId) {
          const rotated = reEncrypt(payment.transactionId)
          if (rotated) {
            // Direct update to bypass middleware encryption
            await prisma.$executeRaw`
              UPDATE apolo.payments
              SET transaction_id = ${rotated}
              WHERE id = ${payment.id}
            `
            result.rotatedRecords++
          } else {
            result.skippedRecords++
          }
        } else {
          result.skippedRecords++
        }
      } catch (error) {
        result.errors.push(`Payment ${payment.id}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }
  } catch (error) {
    result.errors.push(`Failed to fetch payments: ${error instanceof Error ? error.message : "Unknown error"}`)
  }

  return result
}
