/**
 * API Keys Management Endpoint
 *
 * POST /api/keys - Create a new API key
 * GET /api/keys - List API keys (masked)
 * PUT /api/keys - Update API key settings
 * DELETE /api/keys - Revoke/delete an API key
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  withAuth,
  AuthenticatedRequest,
  requireResourcePermission,
} from "@/lib/auth-middleware"
import {
  generateApiKey,
  validateScopes,
  API_KEY_CONFIG,
  API_KEY_SCOPES,
  SCOPE_PRESETS,
  rotateApiKey,
} from "@/lib/api-key"

// GET /api/keys - List API keys
export const GET = withAuth(
  requireResourcePermission("settings", "read")(async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "10", 10)
    const clientId = searchParams.get("clientId")
    const includeDisabled = searchParams.get("includeDisabled") === "true"

    // Build where clause
    const where: Record<string, unknown> = {}
    if (clientId) {
      where.clientId = clientId
    }
    if (!includeDisabled) {
      where.isActive = true
    }

    // Fetch API keys
    const [keys, total] = await Promise.all([
      prisma.apiKey.findMany({
        where,
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          clientId: true,
          scopes: true,
          rateLimitPerMinute: true,
          lastUsedAt: true,
          usageCount: true,
          isActive: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          description: true,
          createdBy: true,
          // Don't return keyHash for security
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.apiKey.count({ where }),
    ])

    // Get available scopes for reference
    const availableScopes = Object.entries(API_KEY_SCOPES).map(
      ([scope, description]) => ({
        scope,
        description,
      })
    )

    return NextResponse.json({
      keys,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      availableScopes,
      scopePresets: SCOPE_PRESETS,
    })
  })
)

// POST /api/keys - Create a new API key
export const POST = withAuth(
  requireResourcePermission("settings", "write")(async (request: AuthenticatedRequest) => {
    try {
      const body = await request.json()

      const {
        name,
        scopes = [],
        clientId,
        description,
        expiresAt,
        rateLimitPerMinute = API_KEY_CONFIG.defaultRateLimit,
      } = body

      // Validate required fields
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "API key name is required" },
          { status: 400 }
        )
      }

      if (name.length > 100) {
        return NextResponse.json(
          { error: "API key name must be 100 characters or less" },
          { status: 400 }
        )
      }

      // Validate scopes
      if (!Array.isArray(scopes) || scopes.length === 0) {
        return NextResponse.json(
          { error: "At least one scope is required" },
          { status: 400 }
        )
      }

      const scopeValidation = validateScopes(scopes)
      if (!scopeValidation.valid) {
        return NextResponse.json(
          {
            error: "Invalid scopes provided",
            invalidScopes: scopeValidation.invalidScopes,
          },
          { status: 400 }
        )
      }

      // Validate rate limit
      const rateLimit = Math.min(
        Math.max(1, rateLimitPerMinute),
        API_KEY_CONFIG.maxRateLimit
      )

      // Validate expiration
      let expirationDate: Date | null = null
      if (expiresAt) {
        expirationDate = new Date(expiresAt)
        if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
          return NextResponse.json(
            { error: "Expiration date must be in the future" },
            { status: 400 }
          )
        }
      }

      // Generate the API key
      const { key, keyHash, keyPrefix } = generateApiKey()

      // Create the API key record
      const apiKey = await prisma.apiKey.create({
        data: {
          name: name.trim(),
          keyHash,
          keyPrefix,
          scopes,
          clientId: clientId || null,
          description: description?.trim() || null,
          expiresAt: expirationDate,
          rateLimitPerMinute: rateLimit,
          createdBy: request.user.id,
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          clientId: true,
          scopes: true,
          rateLimitPerMinute: true,
          isActive: true,
          expiresAt: true,
          createdAt: true,
          description: true,
        },
      })

      // Return the API key - this is the ONLY time the full key is shown
      return NextResponse.json(
        {
          apiKey: {
            ...apiKey,
            key, // Full key - shown once, never again
          },
          message:
            "API key created successfully. Save this key now - it won't be shown again.",
          warning: "Store this key securely. It cannot be retrieved later.",
        },
        { status: 201 }
      )
    } catch (error) {
      console.error("Error creating API key:", error)
      return NextResponse.json(
        { error: "Failed to create API key" },
        { status: 500 }
      )
    }
  })
)

// PUT /api/keys - Update API key settings
export const PUT = withAuth(
  requireResourcePermission("settings", "write")(async (request: AuthenticatedRequest) => {
    try {
      const body = await request.json()

      const { id, name, scopes, description, expiresAt, rateLimitPerMinute, isActive, rotate } =
        body

      if (!id) {
        return NextResponse.json(
          { error: "API key ID is required" },
          { status: 400 }
        )
      }

      // Find existing key
      const existingKey = await prisma.apiKey.findUnique({
        where: { id },
      })

      if (!existingKey) {
        return NextResponse.json(
          { error: "API key not found" },
          { status: 404 }
        )
      }

      // Handle key rotation
      if (rotate) {
        const rotationResult = await rotateApiKey(id)
        if (!rotationResult.success) {
          return NextResponse.json(
            { error: rotationResult.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          message: "API key rotated successfully",
          newKey: rotationResult.newKey,
          warning:
            "Save this new key now. The old key will remain valid for 24 hours.",
          gracePeriodEnds: new Date(
            Date.now() + API_KEY_CONFIG.rotationGracePeriod
          ).toISOString(),
        })
      }

      // Build update data
      const updateData: Record<string, unknown> = {}

      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          return NextResponse.json(
            { error: "Invalid name" },
            { status: 400 }
          )
        }
        updateData.name = name.trim()
      }

      if (scopes !== undefined) {
        if (!Array.isArray(scopes) || scopes.length === 0) {
          return NextResponse.json(
            { error: "At least one scope is required" },
            { status: 400 }
          )
        }
        const scopeValidation = validateScopes(scopes)
        if (!scopeValidation.valid) {
          return NextResponse.json(
            {
              error: "Invalid scopes provided",
              invalidScopes: scopeValidation.invalidScopes,
            },
            { status: 400 }
          )
        }
        updateData.scopes = scopes
      }

      if (description !== undefined) {
        updateData.description = description?.trim() || null
      }

      if (expiresAt !== undefined) {
        if (expiresAt === null) {
          updateData.expiresAt = null
        } else {
          const expirationDate = new Date(expiresAt)
          if (isNaN(expirationDate.getTime())) {
            return NextResponse.json(
              { error: "Invalid expiration date" },
              { status: 400 }
            )
          }
          updateData.expiresAt = expirationDate
        }
      }

      if (rateLimitPerMinute !== undefined) {
        updateData.rateLimitPerMinute = Math.min(
          Math.max(1, rateLimitPerMinute),
          API_KEY_CONFIG.maxRateLimit
        )
      }

      if (isActive !== undefined) {
        updateData.isActive = Boolean(isActive)
      }

      // Update the API key
      const updatedKey = await prisma.apiKey.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          clientId: true,
          scopes: true,
          rateLimitPerMinute: true,
          isActive: true,
          expiresAt: true,
          updatedAt: true,
          description: true,
        },
      })

      return NextResponse.json({
        apiKey: updatedKey,
        message: "API key updated successfully",
      })
    } catch (error) {
      console.error("Error updating API key:", error)
      return NextResponse.json(
        { error: "Failed to update API key" },
        { status: 500 }
      )
    }
  })
)

// DELETE /api/keys - Revoke/delete an API key
export const DELETE = withAuth(
  requireResourcePermission("settings", "delete")(async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const permanent = searchParams.get("permanent") === "true"

    if (!id) {
      return NextResponse.json(
        { error: "API key ID is required" },
        { status: 400 }
      )
    }

    const existingKey = await prisma.apiKey.findUnique({
      where: { id },
    })

    if (!existingKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      )
    }

    if (permanent) {
      // Permanently delete the key and its usage logs
      await prisma.$transaction([
        prisma.apiKeyUsageLog.deleteMany({ where: { apiKeyId: id } }),
        prisma.apiKey.delete({ where: { id } }),
      ])

      return NextResponse.json({
        message: "API key permanently deleted",
      })
    } else {
      // Soft delete (disable)
      await prisma.apiKey.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({
        message: "API key disabled",
      })
    }
  })
)
