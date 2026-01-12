/**
 * OAuth2 Social Login Utilities
 * Supports Google and Facebook OAuth providers
 */

import crypto from "crypto"

// ============================================
// CONFIGURATION
// ============================================

export const OAUTH_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    scopes: ["openid", "email", "profile"],
    isConfigured: () =>
      Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  },
  facebook: {
    clientId: process.env.FACEBOOK_APP_ID || "",
    clientSecret: process.env.FACEBOOK_APP_SECRET || "",
    authorizationUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    userInfoUrl: "https://graph.facebook.com/v19.0/me",
    scopes: ["email", "public_profile"],
    isConfigured: () =>
      Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
  },
}

export type OAuthProviderKey = keyof typeof OAUTH_CONFIG

// ============================================
// TYPES
// ============================================

export interface OAuthUserProfile {
  provider: OAuthProviderKey
  providerUserId: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  rawProfile: Record<string, unknown>
}

export interface OAuthTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  idToken?: string
}

export interface OAuthState {
  provider: OAuthProviderKey
  nonce: string
  returnUrl?: string
  linkUserId?: string // For linking to existing account
  linkCustomerId?: string
  timestamp: number
}

// ============================================
// STATE MANAGEMENT
// ============================================

const STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || "oauth-state-secret"
const STATE_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Generate a secure OAuth state parameter
 */
export function generateOAuthState(data: Omit<OAuthState, "nonce" | "timestamp">): string {
  const state: OAuthState = {
    ...data,
    nonce: crypto.randomBytes(16).toString("hex"),
    timestamp: Date.now(),
  }

  // Encode as base64url JSON
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url")

  // Create HMAC signature
  const signature = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(payload)
    .digest("base64url")

  return `${payload}.${signature}`
}

/**
 * Verify and decode OAuth state parameter
 */
export function verifyOAuthState(stateParam: string): OAuthState | null {
  try {
    const [payload, signature] = stateParam.split(".")
    if (!payload || !signature) return null

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", STATE_SECRET)
      .update(payload)
      .digest("base64url")

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      console.error("OAuth state signature mismatch")
      return null
    }

    // Decode payload
    const state: OAuthState = JSON.parse(Buffer.from(payload, "base64url").toString())

    // Check expiry
    if (Date.now() - state.timestamp > STATE_EXPIRY_MS) {
      console.error("OAuth state expired")
      return null
    }

    return state
  } catch (error) {
    console.error("OAuth state verification failed:", error)
    return null
  }
}

// ============================================
// AUTHORIZATION URL GENERATION
// ============================================

/**
 * Get the callback URL for a provider
 */
export function getCallbackUrl(provider: OAuthProviderKey, baseUrl: string): string {
  return `${baseUrl}/api/auth/oauth/${provider}/callback`
}

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(callbackUrl: string, state: string): string {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.google.clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: OAUTH_CONFIG.google.scopes.join(" "),
    access_type: "offline", // For refresh token
    prompt: "consent", // Force consent to always get refresh token
    state,
  })

  return `${OAUTH_CONFIG.google.authorizationUrl}?${params.toString()}`
}

/**
 * Generate Facebook OAuth authorization URL
 */
export function getFacebookAuthUrl(callbackUrl: string, state: string): string {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.facebook.clientId,
    redirect_uri: callbackUrl,
    scope: OAUTH_CONFIG.facebook.scopes.join(","),
    response_type: "code",
    state,
  })

  return `${OAUTH_CONFIG.facebook.authorizationUrl}?${params.toString()}`
}

// ============================================
// TOKEN EXCHANGE
// ============================================

/**
 * Exchange Google authorization code for tokens
 */
export async function exchangeGoogleCode(
  code: string,
  callbackUrl: string
): Promise<OAuthTokens> {
  const response = await fetch(OAUTH_CONFIG.google.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: OAUTH_CONFIG.google.clientId,
      client_secret: OAUTH_CONFIG.google.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("Google token exchange failed:", error)
    throw new Error(`Failed to exchange Google code: ${response.status}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null,
    idToken: data.id_token,
  }
}

/**
 * Exchange Facebook authorization code for tokens
 */
export async function exchangeFacebookCode(
  code: string,
  callbackUrl: string
): Promise<OAuthTokens> {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.facebook.clientId,
    client_secret: OAUTH_CONFIG.facebook.clientSecret,
    redirect_uri: callbackUrl,
    code,
  })

  const response = await fetch(
    `${OAUTH_CONFIG.facebook.tokenUrl}?${params.toString()}`
  )

  if (!response.ok) {
    const error = await response.text()
    console.error("Facebook token exchange failed:", error)
    throw new Error(`Failed to exchange Facebook code: ${response.status}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: null, // Facebook doesn't provide refresh tokens
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null,
  }
}

// ============================================
// USER PROFILE FETCHING
// ============================================

/**
 * Fetch Google user profile
 */
export async function fetchGoogleProfile(
  accessToken: string
): Promise<OAuthUserProfile> {
  const response = await fetch(OAUTH_CONFIG.google.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Google profile: ${response.status}`)
  }

  const data = await response.json()

  return {
    provider: "google",
    providerUserId: data.sub,
    email: data.email || null,
    name: data.name || null,
    avatarUrl: data.picture || null,
    rawProfile: data,
  }
}

/**
 * Fetch Facebook user profile
 */
export async function fetchFacebookProfile(
  accessToken: string
): Promise<OAuthUserProfile> {
  const params = new URLSearchParams({
    fields: "id,name,email,picture.type(large)",
    access_token: accessToken,
  })

  const response = await fetch(
    `${OAUTH_CONFIG.facebook.userInfoUrl}?${params.toString()}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch Facebook profile: ${response.status}`)
  }

  const data = await response.json()

  return {
    provider: "facebook",
    providerUserId: data.id,
    email: data.email || null,
    name: data.name || null,
    avatarUrl: data.picture?.data?.url || null,
    rawProfile: data,
  }
}

// ============================================
// TOKEN ENCRYPTION (for storage)
// ============================================

const TOKEN_ENCRYPTION_KEY =
  process.env.OAUTH_TOKEN_ENCRYPTION_KEY ||
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||
  "default-oauth-encryption-key-32-characters!"

function getEncryptionKeyBuffer(): Buffer {
  // Ensure key is exactly 32 bytes for AES-256
  return crypto.createHash("sha256").update(TOKEN_ENCRYPTION_KEY).digest()
}

/**
 * Encrypt OAuth token for storage
 */
export function encryptOAuthToken(token: string): string {
  const iv = crypto.randomBytes(16)
  const key = getEncryptionKeyBuffer()
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)

  let encrypted = cipher.update(token, "utf8", "base64")
  encrypted += cipher.final("base64")

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`
}

/**
 * Decrypt OAuth token from storage
 */
export function decryptOAuthToken(encryptedToken: string): string {
  const [ivBase64, authTagBase64, encrypted] = encryptedToken.split(":")
  if (!ivBase64 || !authTagBase64 || !encrypted) {
    throw new Error("Invalid encrypted token format")
  }

  const iv = Buffer.from(ivBase64, "base64")
  const authTag = Buffer.from(authTagBase64, "base64")
  const key = getEncryptionKeyBuffer()

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "base64", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

// ============================================
// PROVIDER AVAILABILITY
// ============================================

export interface OAuthProviderStatus {
  provider: OAuthProviderKey
  enabled: boolean
  displayName: string
  icon: string
}

/**
 * Get available OAuth providers
 */
export function getAvailableProviders(): OAuthProviderStatus[] {
  return [
    {
      provider: "google",
      enabled: OAUTH_CONFIG.google.isConfigured(),
      displayName: "Google",
      icon: "google",
    },
    {
      provider: "facebook",
      enabled: OAUTH_CONFIG.facebook.isConfigured(),
      displayName: "Facebook",
      icon: "facebook",
    },
  ]
}

/**
 * Check if a specific provider is configured
 */
export function isProviderConfigured(provider: OAuthProviderKey): boolean {
  return OAUTH_CONFIG[provider]?.isConfigured() || false
}
