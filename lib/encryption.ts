/**
 * Data Encryption at Rest Utilities
 *
 * Provides AES-256-GCM encryption for sensitive PII fields in the database.
 * Supports key rotation without downtime.
 *
 * Environment variables:
 * - ENCRYPTION_KEY: Primary encryption key (required, min 32 chars)
 * - ENCRYPTION_KEY_PREVIOUS: Previous key for rotation (optional)
 * - ENCRYPTION_KEY_ID: Key identifier for rotation tracking (optional, default: "1")
 */

import crypto from "crypto"

// Configuration
const ENCRYPTION_ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16 // 128 bits for AES-GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
const KEY_DERIVATION_SALT = "apoloshop-encryption-v1"

// Get encryption keys from environment
const PRIMARY_KEY = process.env.ENCRYPTION_KEY || ""
const PREVIOUS_KEY = process.env.ENCRYPTION_KEY_PREVIOUS || ""
const KEY_ID = process.env.ENCRYPTION_KEY_ID || "1"

// Prefix for encrypted values to identify them
const ENCRYPTED_PREFIX = "enc:"

// Fields that should be encrypted (model.field format)
export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  Customer: ["phone", "email", "notes"],
  Payment: ["transactionId"],
  // Add more models and fields as needed
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  return PRIMARY_KEY.length >= 32
}

/**
 * Derive a 32-byte key from the provided key string using scrypt
 */
function deriveKey(keyString: string): Buffer {
  return crypto.scryptSync(keyString, KEY_DERIVATION_SALT, 32)
}

/**
 * Check if a value is already encrypted (has the encrypted prefix)
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX)
}

/**
 * Encrypt a string value using AES-256-GCM
 * Returns format: enc:keyId:iv:authTag:ciphertext (all hex encoded)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.length === 0) {
    return plaintext
  }

  // Don't double-encrypt
  if (isEncrypted(plaintext)) {
    return plaintext
  }

  if (!isEncryptionConfigured()) {
    console.warn("Warning: ENCRYPTION_KEY not set or too short. Data will not be encrypted.")
    return plaintext
  }

  try {
    const key = deriveKey(PRIMARY_KEY)
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })

    let ciphertext = cipher.update(plaintext, "utf8", "hex")
    ciphertext += cipher.final("hex")

    const authTag = cipher.getAuthTag()

    // Format: enc:keyId:iv:authTag:ciphertext
    return `${ENCRYPTED_PREFIX}${KEY_ID}:${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext}`
  } catch (error) {
    console.error("Encryption error:", error)
    throw new Error("Failed to encrypt data")
  }
}

/**
 * Decrypt an encrypted string value
 * Supports key rotation by trying current key first, then previous key
 */
export function decrypt(encryptedValue: string): string {
  if (!encryptedValue || encryptedValue.length === 0) {
    return encryptedValue
  }

  // If not encrypted, return as-is
  if (!isEncrypted(encryptedValue)) {
    return encryptedValue
  }

  if (!isEncryptionConfigured()) {
    throw new Error("Cannot decrypt: ENCRYPTION_KEY not configured")
  }

  try {
    // Parse the encrypted format
    const parts = encryptedValue.slice(ENCRYPTED_PREFIX.length).split(":")
    if (parts.length !== 4) {
      throw new Error("Invalid encrypted value format")
    }

    const [keyId, ivHex, authTagHex, ciphertext] = parts
    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")

    // Try decryption with current key
    try {
      return decryptWithKey(ciphertext, iv, authTag, PRIMARY_KEY)
    } catch {
      // If current key fails and we have a previous key, try that
      if (PREVIOUS_KEY && keyId !== KEY_ID) {
        try {
          return decryptWithKey(ciphertext, iv, authTag, PREVIOUS_KEY)
        } catch {
          throw new Error("Decryption failed with all available keys")
        }
      }
      throw new Error("Decryption failed")
    }
  } catch (error) {
    console.error("Decryption error:", error)
    throw new Error("Failed to decrypt data")
  }
}

/**
 * Internal function to decrypt with a specific key
 */
function decryptWithKey(
  ciphertext: string,
  iv: Buffer,
  authTag: Buffer,
  keyString: string
): string {
  const key = deriveKey(keyString)

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(ciphertext, "hex", "utf8")
  plaintext += decipher.final("utf8")

  return plaintext
}

/**
 * Re-encrypt a value with the current key (for key rotation)
 * Returns null if the value is already encrypted with the current key
 */
export function reEncrypt(encryptedValue: string): string | null {
  if (!encryptedValue || !isEncrypted(encryptedValue)) {
    return null
  }

  // Check if already encrypted with current key
  const keyIdInValue = encryptedValue.slice(ENCRYPTED_PREFIX.length).split(":")[0]
  if (keyIdInValue === KEY_ID) {
    return null // Already using current key
  }

  // Decrypt and re-encrypt with current key
  const plaintext = decrypt(encryptedValue)
  return encrypt(plaintext)
}

/**
 * Encrypt multiple fields in an object
 */
export function encryptFields<T extends Record<string, unknown>>(
  data: T,
  fields: string[]
): T {
  const result = { ...data }

  for (const field of fields) {
    const value = result[field]
    if (typeof value === "string" && value.length > 0) {
      (result as Record<string, unknown>)[field] = encrypt(value)
    }
  }

  return result
}

/**
 * Decrypt multiple fields in an object
 */
export function decryptFields<T extends Record<string, unknown>>(
  data: T,
  fields: string[]
): T {
  const result = { ...data }

  for (const field of fields) {
    const value = result[field]
    if (typeof value === "string" && isEncrypted(value)) {
      (result as Record<string, unknown>)[field] = decrypt(value)
    }
  }

  return result
}

/**
 * Get the fields that should be encrypted for a given model
 */
export function getEncryptedFieldsForModel(modelName: string): string[] {
  return ENCRYPTED_FIELDS[modelName] || []
}

/**
 * Check if a model has encrypted fields configured
 */
export function hasEncryptedFields(modelName: string): boolean {
  return (ENCRYPTED_FIELDS[modelName]?.length ?? 0) > 0
}

// Types for Prisma middleware
export interface EncryptionStats {
  encrypted: number
  decrypted: number
  errors: number
}

/**
 * Create encryption statistics tracker
 */
export function createEncryptionStats(): EncryptionStats {
  return {
    encrypted: 0,
    decrypted: 0,
    errors: 0,
  }
}

// Key rotation types and utilities
export interface KeyRotationResult {
  model: string
  totalRecords: number
  rotatedRecords: number
  skippedRecords: number
  errors: string[]
}

export interface KeyRotationSummary {
  success: boolean
  startedAt: Date
  completedAt: Date
  results: KeyRotationResult[]
  totalRotated: number
  totalErrors: number
}

/**
 * Check if key rotation is needed (previous key is set and data exists encrypted with it)
 */
export function isKeyRotationNeeded(): boolean {
  if (!PREVIOUS_KEY) {
    return false
  }
  // If there's a previous key, rotation might be needed
  return true
}

/**
 * Get encryption configuration status (for admin dashboard)
 */
export function getEncryptionStatus(): {
  configured: boolean
  currentKeyId: string
  hasPreviousKey: boolean
  encryptedModels: string[]
} {
  return {
    configured: isEncryptionConfigured(),
    currentKeyId: KEY_ID,
    hasPreviousKey: !!PREVIOUS_KEY,
    encryptedModels: Object.keys(ENCRYPTED_FIELDS),
  }
}
