/**
 * OAuth Service - Handles account creation, linking, and login
 */

import { prisma } from "@/lib/prisma"
import {
  OAuthUserProfile,
  OAuthTokens,
  encryptOAuthToken,
} from "@/lib/oauth"
import { generateTokenPair, signToken, ACCESS_TOKEN_EXPIRY_MS } from "@/lib/jwt"
import { createSession } from "@/lib/session-service"
import { OAuthProvider } from "@prisma/client"

// ============================================
// TYPES
// ============================================

export interface OAuthLoginResult {
  success: boolean
  isNewAccount: boolean
  isLinked: boolean
  user?: {
    id: string
    email: string
    name: string
    role: string
    permissions: Record<string, string[]>
    twoFactorEnabled?: boolean
  }
  customer?: {
    id: string
    name: string
    email: string | null
    phone: string
  }
  accessToken?: string
  expiresIn?: number
  error?: string
  errorCode?: string
}

export interface LinkAccountResult {
  success: boolean
  error?: string
  errorCode?: string
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapProviderToEnum(provider: "google" | "facebook"): OAuthProvider {
  return provider.toUpperCase() as OAuthProvider
}

/**
 * Find existing social account by provider and provider user ID
 */
export async function findSocialAccount(
  provider: "google" | "facebook",
  providerUserId: string
) {
  return prisma.socialAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: mapProviderToEnum(provider),
        providerUserId,
      },
    },
    include: {
      user: {
        include: { role: true },
      },
      customer: true,
    },
  })
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: { role: true },
  })
}

/**
 * Find customer by email
 */
export async function findCustomerByEmail(email: string) {
  return prisma.customer.findFirst({
    where: { email },
  })
}

// ============================================
// ACCOUNT OPERATIONS
// ============================================

/**
 * Create or update social account record
 */
export async function upsertSocialAccount(
  profile: OAuthUserProfile,
  tokens: OAuthTokens,
  linkTo?: { userId?: string; customerId?: string }
) {
  const providerEnum = mapProviderToEnum(profile.provider)

  // Encrypt tokens before storage
  const encryptedAccessToken = encryptOAuthToken(tokens.accessToken)
  const encryptedRefreshToken = tokens.refreshToken
    ? encryptOAuthToken(tokens.refreshToken)
    : null

  return prisma.socialAccount.upsert({
    where: {
      provider_providerUserId: {
        provider: providerEnum,
        providerUserId: profile.providerUserId,
      },
    },
    update: {
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: tokens.expiresAt,
      rawProfile: profile.rawProfile,
      updatedAt: new Date(),
      // Update link if provided
      ...(linkTo?.userId && { userId: linkTo.userId }),
      ...(linkTo?.customerId && { customerId: linkTo.customerId }),
    },
    create: {
      provider: providerEnum,
      providerUserId: profile.providerUserId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: tokens.expiresAt,
      rawProfile: profile.rawProfile,
      userId: linkTo?.userId,
      customerId: linkTo?.customerId,
    },
    include: {
      user: { include: { role: true } },
      customer: true,
    },
  })
}

/**
 * Create a new customer from OAuth profile
 */
export async function createCustomerFromOAuth(
  profile: OAuthUserProfile
): Promise<{ id: string; name: string; email: string | null; phone: string }> {
  // Generate a unique phone placeholder since phone is required
  const phonePlaceholder = `oauth_${profile.provider}_${profile.providerUserId}`

  const customer = await prisma.customer.create({
    data: {
      name: profile.name || profile.email || "OAuth User",
      email: profile.email,
      phone: phonePlaceholder, // Required field, use placeholder
      notes: `Created via ${profile.provider} OAuth login`,
      tags: [profile.provider],
    },
  })

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
  }
}

// ============================================
// MAIN LOGIN/SIGNUP FLOW
// ============================================

/**
 * Process OAuth login/signup for customers
 *
 * Flow:
 * 1. Check if social account exists -> login
 * 2. Check if email matches existing customer -> link & login
 * 3. Create new customer account
 */
export async function processOAuthLogin(
  profile: OAuthUserProfile,
  tokens: OAuthTokens,
  requestInfo: { ipAddress?: string; userAgent?: string }
): Promise<OAuthLoginResult> {
  try {
    // 1. Check for existing social account
    const existingSocialAccount = await findSocialAccount(
      profile.provider,
      profile.providerUserId
    )

    if (existingSocialAccount) {
      // Update tokens
      await upsertSocialAccount(profile, tokens, {
        userId: existingSocialAccount.userId || undefined,
        customerId: existingSocialAccount.customerId || undefined,
      })

      // Return existing user/customer
      if (existingSocialAccount.user) {
        const user = existingSocialAccount.user
        const permissions =
          (user.role.permissions as Record<string, string[]>) || {}

        const tokenPair = generateTokenPair({
          userId: user.id,
          roleId: user.roleId,
          email: user.email,
          role: user.role.name,
          permissions,
        })

        // Create session
        const legacyToken = signToken({
          userId: user.id,
          roleId: user.roleId,
          email: user.email,
        })

        await createSession({
          userId: user.id,
          token: legacyToken,
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent,
        })

        return {
          success: true,
          isNewAccount: false,
          isLinked: false,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role.name,
            permissions,
            twoFactorEnabled: user.twoFactorEnabled,
          },
          accessToken: tokenPair.accessToken,
          expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000),
        }
      }

      if (existingSocialAccount.customer) {
        return {
          success: true,
          isNewAccount: false,
          isLinked: false,
          customer: {
            id: existingSocialAccount.customer.id,
            name: existingSocialAccount.customer.name,
            email: existingSocialAccount.customer.email,
            phone: existingSocialAccount.customer.phone,
          },
        }
      }
    }

    // 2. Check for existing user/customer with matching email
    if (profile.email) {
      // Check for admin user
      const existingUser = await findUserByEmail(profile.email)
      if (existingUser && existingUser.isActive) {
        // Link social account to existing user
        await upsertSocialAccount(profile, tokens, { userId: existingUser.id })

        const permissions =
          (existingUser.role.permissions as Record<string, string[]>) || {}

        const tokenPair = generateTokenPair({
          userId: existingUser.id,
          roleId: existingUser.roleId,
          email: existingUser.email,
          role: existingUser.role.name,
          permissions,
        })

        // Create session
        const legacyToken = signToken({
          userId: existingUser.id,
          roleId: existingUser.roleId,
          email: existingUser.email,
        })

        await createSession({
          userId: existingUser.id,
          token: legacyToken,
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent,
        })

        return {
          success: true,
          isNewAccount: false,
          isLinked: true, // Account was linked
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            role: existingUser.role.name,
            permissions,
            twoFactorEnabled: existingUser.twoFactorEnabled,
          },
          accessToken: tokenPair.accessToken,
          expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000),
        }
      }

      // Check for customer
      const existingCustomer = await findCustomerByEmail(profile.email)
      if (existingCustomer) {
        // Link social account to existing customer
        await upsertSocialAccount(profile, tokens, {
          customerId: existingCustomer.id,
        })

        return {
          success: true,
          isNewAccount: false,
          isLinked: true, // Account was linked
          customer: {
            id: existingCustomer.id,
            name: existingCustomer.name,
            email: existingCustomer.email,
            phone: existingCustomer.phone,
          },
        }
      }
    }

    // 3. Create new customer account
    const newCustomer = await createCustomerFromOAuth(profile)

    // Create social account linked to new customer
    await upsertSocialAccount(profile, tokens, { customerId: newCustomer.id })

    return {
      success: true,
      isNewAccount: true,
      isLinked: false,
      customer: newCustomer,
    }
  } catch (error) {
    console.error("OAuth login error:", error)
    return {
      success: false,
      isNewAccount: false,
      isLinked: false,
      error: error instanceof Error ? error.message : "OAuth login failed",
      errorCode: "OAUTH_LOGIN_FAILED",
    }
  }
}

/**
 * Link a social account to an existing user (for account settings)
 */
export async function linkSocialAccountToUser(
  userId: string,
  profile: OAuthUserProfile,
  tokens: OAuthTokens
): Promise<LinkAccountResult> {
  try {
    // Check if this social account is already linked to another user
    const existingAccount = await findSocialAccount(
      profile.provider,
      profile.providerUserId
    )

    if (existingAccount) {
      if (existingAccount.userId && existingAccount.userId !== userId) {
        return {
          success: false,
          error: `This ${profile.provider} account is already linked to another user`,
          errorCode: "ACCOUNT_ALREADY_LINKED",
        }
      }
      if (existingAccount.customerId) {
        return {
          success: false,
          error: `This ${profile.provider} account is already linked to a customer account`,
          errorCode: "ACCOUNT_ALREADY_LINKED",
        }
      }
    }

    // Link the account
    await upsertSocialAccount(profile, tokens, { userId })

    return { success: true }
  } catch (error) {
    console.error("Link social account error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to link account",
      errorCode: "LINK_FAILED",
    }
  }
}

/**
 * Link a social account to an existing customer
 */
export async function linkSocialAccountToCustomer(
  customerId: string,
  profile: OAuthUserProfile,
  tokens: OAuthTokens
): Promise<LinkAccountResult> {
  try {
    // Check if this social account is already linked
    const existingAccount = await findSocialAccount(
      profile.provider,
      profile.providerUserId
    )

    if (existingAccount) {
      if (existingAccount.userId) {
        return {
          success: false,
          error: `This ${profile.provider} account is already linked to an admin user`,
          errorCode: "ACCOUNT_ALREADY_LINKED",
        }
      }
      if (
        existingAccount.customerId &&
        existingAccount.customerId !== customerId
      ) {
        return {
          success: false,
          error: `This ${profile.provider} account is already linked to another customer`,
          errorCode: "ACCOUNT_ALREADY_LINKED",
        }
      }
    }

    // Link the account
    await upsertSocialAccount(profile, tokens, { customerId })

    return { success: true }
  } catch (error) {
    console.error("Link social account error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to link account",
      errorCode: "LINK_FAILED",
    }
  }
}

/**
 * Unlink a social account
 */
export async function unlinkSocialAccount(
  provider: "google" | "facebook",
  userId?: string,
  customerId?: string
): Promise<LinkAccountResult> {
  try {
    const where: { provider: OAuthProvider; userId?: string; customerId?: string } = {
      provider: mapProviderToEnum(provider),
    }

    if (userId) where.userId = userId
    if (customerId) where.customerId = customerId

    if (!userId && !customerId) {
      return {
        success: false,
        error: "Must specify userId or customerId",
        errorCode: "INVALID_REQUEST",
      }
    }

    await prisma.socialAccount.deleteMany({ where })

    return { success: true }
  } catch (error) {
    console.error("Unlink social account error:", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to unlink account",
      errorCode: "UNLINK_FAILED",
    }
  }
}

/**
 * Get social accounts for a user
 */
export async function getUserSocialAccounts(userId: string) {
  return prisma.socialAccount.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      providerUserId: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
    },
  })
}

/**
 * Get social accounts for a customer
 */
export async function getCustomerSocialAccounts(customerId: string) {
  return prisma.socialAccount.findMany({
    where: { customerId },
    select: {
      id: true,
      provider: true,
      providerUserId: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
    },
  })
}
