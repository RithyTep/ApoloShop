import { Prisma, PrismaClient } from "@prisma/client"
import {
  encrypt,
  decrypt,
  isEncrypted,
  getEncryptedFieldsForModel,
  hasEncryptedFields,
  isEncryptionConfigured,
} from "./encryption"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma middleware for transparent field encryption/decryption
 * Encrypts PII fields on write operations, decrypts on read operations
 */
const encryptionMiddleware: Prisma.Middleware = async (params, next) => {
  // Skip if encryption is not configured
  if (!isEncryptionConfigured()) {
    return next(params)
  }

  const model = params.model
  if (!model || !hasEncryptedFields(model)) {
    return next(params)
  }

  const encryptedFields = getEncryptedFieldsForModel(model)

  // Encrypt on write operations (create, update, upsert)
  if (params.action === "create" || params.action === "update" || params.action === "upsert") {
    // Handle create data
    if (params.args.data) {
      params.args.data = encryptFieldsInData(params.args.data, encryptedFields)
    }

    // Handle upsert create/update data
    if (params.action === "upsert") {
      if (params.args.create) {
        params.args.create = encryptFieldsInData(params.args.create, encryptedFields)
      }
      if (params.args.update) {
        params.args.update = encryptFieldsInData(params.args.update, encryptedFields)
      }
    }

    // Handle createMany
    if (params.action === "create" && Array.isArray(params.args.data)) {
      params.args.data = params.args.data.map((item: Record<string, unknown>) =>
        encryptFieldsInData(item, encryptedFields)
      )
    }
  }

  // Handle createMany separately
  if (params.action === "createMany" && params.args.data) {
    if (Array.isArray(params.args.data)) {
      params.args.data = params.args.data.map((item: Record<string, unknown>) =>
        encryptFieldsInData(item, encryptedFields)
      )
    }
  }

  // Handle updateMany
  if (params.action === "updateMany" && params.args.data) {
    params.args.data = encryptFieldsInData(params.args.data, encryptedFields)
  }

  // Execute the query
  const result = await next(params)

  // Decrypt on read operations (findUnique, findFirst, findMany)
  if (
    params.action === "findUnique" ||
    params.action === "findFirst" ||
    params.action === "findMany"
  ) {
    if (Array.isArray(result)) {
      return result.map((item: Record<string, unknown>) =>
        decryptFieldsInData(item, encryptedFields)
      )
    } else if (result && typeof result === "object") {
      return decryptFieldsInData(result as Record<string, unknown>, encryptedFields)
    }
  }

  // Decrypt result from create/update/upsert
  if (
    (params.action === "create" ||
      params.action === "update" ||
      params.action === "upsert") &&
    result &&
    typeof result === "object"
  ) {
    return decryptFieldsInData(result as Record<string, unknown>, encryptedFields)
  }

  return result
}

/**
 * Encrypt specified fields in a data object
 */
function encryptFieldsInData(
  data: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const result = { ...data }

  for (const field of fields) {
    const value = result[field]
    if (typeof value === "string" && value.length > 0 && !isEncrypted(value)) {
      result[field] = encrypt(value)
    }
  }

  return result
}

/**
 * Decrypt specified fields in a data object
 */
function decryptFieldsInData(
  data: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const result = { ...data }

  for (const field of fields) {
    const value = result[field]
    if (typeof value === "string" && isEncrypted(value)) {
      try {
        result[field] = decrypt(value)
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error)
        // Keep the encrypted value if decryption fails
      }
    }
  }

  return result
}

// Create Prisma client with middleware
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

  // Add encryption middleware
  client.$use(encryptionMiddleware)

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export default prisma
