/**
 * TOTP (Time-based One-Time Password) utilities for 2FA
 *
 * Uses otplib for TOTP generation/verification and qrcode for QR generation
 */

import { OTP, generateSecret as otplibGenerateSecret, generateURI, verify } from "otplib"
import * as QRCode from "qrcode"
import crypto from "crypto"

// Create OTP instance with default TOTP strategy
const otp = new OTP({ strategy: "totp" })

// Encryption for storing secrets
const ENCRYPTION_KEY = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.JWT_SECRET || ""
const ENCRYPTION_ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16

/**
 * Generate a new TOTP secret
 */
export function generateSecret(): string {
  return otplibGenerateSecret()
}

/**
 * Verify a TOTP code against a secret
 */
export async function verifyTOTP(token: string, secret: string): Promise<boolean> {
  try {
    return await verify({ token, secret, epochTolerance: 1 })
  } catch {
    return false
  }
}

/**
 * Verify TOTP code synchronously
 */
export function verifyTOTPSync(token: string, secret: string): boolean {
  try {
    // Use the OTP instance for sync verification
    return otp.verifySync({ token, secret, epochTolerance: 1 })
  } catch {
    return false
  }
}

/**
 * Generate a TOTP code for testing (admin use only)
 */
export async function generateTOTP(secret: string): Promise<string> {
  return otp.generate({ secret })
}

/**
 * Generate a key URI for authenticator apps
 * Format: otpauth://totp/{issuer}:{label}?secret={secret}&issuer={issuer}
 */
export function generateKeyUri(
  email: string,
  secret: string,
  issuer: string = "ApoloShop"
): string {
  return generateURI({
    label: email,
    secret,
    issuer,
  })
}

/**
 * Generate a QR code as a data URL for the TOTP secret
 */
export async function generateQRCode(keyUri: string): Promise<string> {
  try {
    return await QRCode.toDataURL(keyUri, {
      errorCorrectionLevel: "M",
      type: "image/png",
      margin: 2,
      width: 256,
    })
  } catch (error) {
    console.error("Error generating QR code:", error)
    throw new Error("Failed to generate QR code")
  }
}

/**
 * Generate recovery codes (one-time use backup codes)
 * Returns unhashed codes for display and hashed codes for storage
 */
export function generateRecoveryCodes(count: number = 10): {
  codes: string[]
  hashedCodes: string[]
} {
  const codes: string[] = []
  const hashedCodes: string[] = []

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes (format: XXXX-XXXX)
    const part1 = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4)
    const part2 = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4)
    const code = `${part1}-${part2}`

    codes.push(code)
    hashedCodes.push(hashRecoveryCode(code))
  }

  return { codes, hashedCodes }
}

/**
 * Hash a recovery code for storage
 */
export function hashRecoveryCode(code: string): string {
  // Normalize code (remove dashes, uppercase)
  const normalized = code.replace(/-/g, "").toUpperCase()
  return crypto.createHash("sha256").update(normalized).digest("hex")
}

/**
 * Verify a recovery code against stored hashed codes
 * Returns the index of the matching code if found, -1 otherwise
 */
export function verifyRecoveryCode(
  code: string,
  hashedCodes: string[]
): { valid: boolean; index: number } {
  const inputHash = hashRecoveryCode(code)
  const index = hashedCodes.findIndex((hash) => hash === inputHash)
  return { valid: index !== -1, index }
}

/**
 * Encrypt a TOTP secret for database storage
 */
export function encryptSecret(secret: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    // If no proper encryption key, just base64 encode (not secure, but allows development)
    console.warn("Warning: TWO_FACTOR_ENCRYPTION_KEY not set or too short. Using base64 encoding only.")
    return Buffer.from(secret).toString("base64")
  }

  // Ensure key is exactly 32 bytes for AES-256
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
  let encrypted = cipher.update(secret, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  // Return format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

/**
 * Decrypt a TOTP secret from database storage
 */
export function decryptSecret(encryptedSecret: string): string {
  // Check if it's just base64 encoded (development mode)
  if (!encryptedSecret.includes(":")) {
    return Buffer.from(encryptedSecret, "base64").toString("utf8")
  }

  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error("Cannot decrypt: TWO_FACTOR_ENCRYPTION_KEY not set or too short")
  }

  const parts = encryptedSecret.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret format")
  }

  const [ivHex, authTagHex, encrypted] = parts
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

/**
 * Format recovery codes for display (2 columns)
 */
export function formatRecoveryCodesForDisplay(codes: string[]): string {
  const lines: string[] = []
  for (let i = 0; i < codes.length; i += 2) {
    const left = codes[i] || ""
    const right = codes[i + 1] || ""
    lines.push(`${left}    ${right}`)
  }
  return lines.join("\n")
}

// Types
export interface TwoFactorSetupData {
  secret: string // Plain secret for QR generation
  keyUri: string // otpauth:// URI
  qrCode: string // Data URL for QR image
  recoveryCodes: string[] // Plain codes to show user once
}

export interface TwoFactorStorageData {
  encryptedSecret: string // Encrypted secret for DB storage
  hashedRecoveryCodes: string[] // Hashed codes for DB storage
}
