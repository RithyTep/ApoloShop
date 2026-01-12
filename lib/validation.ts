/**
 * Centralized request validation middleware using Zod
 * US-048: Input validation middleware
 *
 * Features:
 * - Validation schemas for body, query params, and path params
 * - XSS sanitization for string inputs
 * - Detailed validation errors (400 response)
 * - Type-safe validated data in route handlers
 */

import { NextRequest, NextResponse } from "next/server"
import { z, ZodSchema, ZodError, ZodIssue } from "zod"

// ============================================
// XSS SANITIZATION UTILITIES
// ============================================

/**
 * Common XSS attack patterns to detect and sanitize
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /javascript:/gi, // JavaScript protocol
  /on\w+\s*=/gi, // Event handlers (onclick, onerror, etc.)
  /data:\s*text\/html/gi, // Data URIs with HTML
  /<iframe\b/gi, // iframes
  /<object\b/gi, // objects
  /<embed\b/gi, // embeds
  /<link\b[^>]*\bhref\s*=/gi, // links with href
  /<style\b/gi, // style tags
  /expression\s*\(/gi, // CSS expressions
  /url\s*\(\s*["']?\s*javascript:/gi, // CSS url() with javascript
  /<!--.*?-->/gs, // HTML comments
]

/**
 * Characters that should be HTML entity encoded
 */
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
}

/**
 * Sanitize a string by removing XSS attack patterns
 * @param input - The string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeString(
  input: string,
  options: {
    /** Remove all HTML tags */
    stripTags?: boolean
    /** Encode HTML entities */
    encodeEntities?: boolean
    /** Trim whitespace */
    trim?: boolean
    /** Max length (truncate if exceeded) */
    maxLength?: number
  } = {}
): string {
  const { stripTags = true, encodeEntities = false, trim = true, maxLength } = options

  let result = input

  // Trim whitespace
  if (trim) {
    result = result.trim()
  }

  // Remove null bytes
  result = result.replace(/\0/g, "")

  // Remove XSS patterns
  for (const pattern of XSS_PATTERNS) {
    result = result.replace(pattern, "")
  }

  // Strip HTML tags
  if (stripTags) {
    result = result.replace(/<[^>]*>/g, "")
  }

  // Encode HTML entities
  if (encodeEntities) {
    result = result.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
  }

  // Truncate if needed
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength)
  }

  return result
}

/**
 * Check if a string contains potential XSS patterns
 * @param input - The string to check
 * @returns True if suspicious patterns detected
 */
export function containsXSS(input: string): boolean {
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return true
    }
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0
  }
  return false
}

/**
 * Deep sanitize an object by sanitizing all string values
 * @param obj - Object to sanitize
 * @param options - Sanitization options
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: Parameters<typeof sanitizeString>[1] = {}
): T {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeString(value, options)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeString(item, options)
          : typeof item === "object" && item !== null
          ? sanitizeObject(item as Record<string, unknown>, options)
          : item
      )
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>, options)
    } else {
      result[key] = value
    }
  }

  return result as T
}

// ============================================
// VALIDATION ERROR FORMATTING
// ============================================

/**
 * Error codes for validation errors
 */
export const VALIDATION_ERROR_CODES = {
  INVALID_BODY: "INVALID_BODY",
  INVALID_QUERY: "INVALID_QUERY",
  INVALID_PARAMS: "INVALID_PARAMS",
  BODY_REQUIRED: "BODY_REQUIRED",
  INVALID_JSON: "INVALID_JSON",
  XSS_DETECTED: "XSS_DETECTED",
} as const

export type ValidationErrorCode = (typeof VALIDATION_ERROR_CODES)[keyof typeof VALIDATION_ERROR_CODES]

/**
 * Format Zod errors into a client-friendly structure
 */
export interface FormattedValidationError {
  error: string
  code: ValidationErrorCode
  details: {
    field: string
    message: string
    code: string
  }[]
  summary: {
    fieldErrors: Record<string, string[]>
    formErrors: string[]
  }
}

/**
 * Format a ZodError into a structured response
 */
export function formatValidationError(
  error: ZodError,
  code: ValidationErrorCode
): FormattedValidationError {
  const flattened = error.flatten()

  const details = error.issues.map((issue: ZodIssue) => ({
    field: issue.path.join(".") || "(root)",
    message: issue.message,
    code: issue.code,
  }))

  return {
    error: "Validation failed",
    code,
    details,
    summary: {
      fieldErrors: flattened.fieldErrors as Record<string, string[]>,
      formErrors: flattened.formErrors,
    },
  }
}

// ============================================
// VALIDATED REQUEST TYPES
// ============================================

/**
 * Request with validated body data
 */
export type ValidatedBodyRequest<T> = NextRequest & {
  validatedBody: T
}

/**
 * Request with validated query parameters
 */
export type ValidatedQueryRequest<T> = NextRequest & {
  validatedQuery: T
}

/**
 * Request with validated path parameters
 */
export type ValidatedParamsRequest<T> = NextRequest & {
  validatedParams: T
}

/**
 * Request with all validated data
 */
export type FullyValidatedRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
> = NextRequest & {
  validatedBody?: TBody
  validatedQuery?: TQuery
  validatedParams?: TParams
}

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

/**
 * Options for validation middleware
 */
export interface ValidationOptions {
  /** Sanitize string inputs (default: true) */
  sanitize?: boolean
  /** Sanitization options */
  sanitizeOptions?: Parameters<typeof sanitizeString>[1]
  /** Reject requests with XSS patterns (default: true) */
  rejectXSS?: boolean
}

const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  sanitize: true,
  sanitizeOptions: {
    stripTags: true,
    encodeEntities: false,
    trim: true,
  },
  rejectXSS: true,
}

/**
 * Higher-order function to validate request body
 *
 * @example
 * const createUserSchema = z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 * })
 *
 * export const POST = withBodyValidation(createUserSchema)(async (request) => {
 *   const { name, email } = request.validatedBody
 *   // Type-safe access to validated data
 * })
 */
export function withBodyValidation<T extends ZodSchema>(
  schema: T,
  options: ValidationOptions = {}
) {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options }

  return function <TRequest extends NextRequest>(
    handler: (
      request: TRequest & ValidatedBodyRequest<z.infer<T>>
    ) => Promise<NextResponse>
  ) {
    return async (request: TRequest) => {
      // Parse JSON body
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return NextResponse.json(
          {
            error: "Invalid JSON body",
            code: VALIDATION_ERROR_CODES.INVALID_JSON,
          },
          { status: 400 }
        )
      }

      // Check for XSS in raw body before sanitization
      if (opts.rejectXSS && typeof body === "object" && body !== null) {
        const xssField = findXSSField(body as Record<string, unknown>)
        if (xssField) {
          return NextResponse.json(
            {
              error: `Potentially malicious content detected in field: ${xssField}`,
              code: VALIDATION_ERROR_CODES.XSS_DETECTED,
              field: xssField,
            },
            { status: 400 }
          )
        }
      }

      // Sanitize string inputs
      if (opts.sanitize && typeof body === "object" && body !== null) {
        body = sanitizeObject(body as Record<string, unknown>, opts.sanitizeOptions)
      }

      // Validate against schema
      const result = schema.safeParse(body)

      if (!result.success) {
        return NextResponse.json(
          formatValidationError(result.error, VALIDATION_ERROR_CODES.INVALID_BODY),
          { status: 400 }
        )
      }

      // Attach validated data to request
      const validatedRequest = request as TRequest & ValidatedBodyRequest<z.infer<T>>
      validatedRequest.validatedBody = result.data

      return handler(validatedRequest)
    }
  }
}

/**
 * Higher-order function to validate query parameters
 *
 * @example
 * const listQuerySchema = z.object({
 *   page: z.coerce.number().int().positive().default(1),
 *   limit: z.coerce.number().int().min(1).max(100).default(20),
 *   search: z.string().optional(),
 * })
 *
 * export const GET = withQueryValidation(listQuerySchema)(async (request) => {
 *   const { page, limit, search } = request.validatedQuery
 *   // Type-safe access to validated query params
 * })
 */
export function withQueryValidation<T extends ZodSchema>(
  schema: T,
  options: ValidationOptions = {}
) {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options }

  return function <TRequest extends NextRequest>(
    handler: (
      request: TRequest & ValidatedQueryRequest<z.infer<T>>
    ) => Promise<NextResponse>
  ) {
    return async (request: TRequest) => {
      // Extract query parameters
      const searchParams = new URL(request.url).searchParams
      const query: Record<string, string | string[]> = {}

      for (const [key, value] of searchParams.entries()) {
        // Handle array params (e.g., ?ids=1&ids=2)
        if (query[key] !== undefined) {
          if (Array.isArray(query[key])) {
            (query[key] as string[]).push(value)
          } else {
            query[key] = [query[key] as string, value]
          }
        } else {
          query[key] = value
        }
      }

      // Check for XSS
      if (opts.rejectXSS) {
        const xssField = findXSSField(query)
        if (xssField) {
          return NextResponse.json(
            {
              error: `Potentially malicious content detected in query parameter: ${xssField}`,
              code: VALIDATION_ERROR_CODES.XSS_DETECTED,
              field: xssField,
            },
            { status: 400 }
          )
        }
      }

      // Sanitize
      const sanitizedQuery = opts.sanitize
        ? sanitizeObject(query, opts.sanitizeOptions)
        : query

      // Validate
      const result = schema.safeParse(sanitizedQuery)

      if (!result.success) {
        return NextResponse.json(
          formatValidationError(result.error, VALIDATION_ERROR_CODES.INVALID_QUERY),
          { status: 400 }
        )
      }

      // Attach validated data
      const validatedRequest = request as TRequest & ValidatedQueryRequest<z.infer<T>>
      validatedRequest.validatedQuery = result.data

      return handler(validatedRequest)
    }
  }
}

/**
 * Higher-order function to validate path parameters
 *
 * @example
 * const paramsSchema = z.object({
 *   id: z.string().uuid("Invalid product ID"),
 * })
 *
 * export const GET = withParamsValidation(paramsSchema)(async (request, { params }) => {
 *   const { id } = request.validatedParams
 *   // Type-safe access to validated path params
 * })
 */
export function withParamsValidation<T extends ZodSchema>(
  schema: T,
  options: ValidationOptions = {}
) {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options }

  return function <TRequest extends NextRequest>(
    handler: (
      request: TRequest & ValidatedParamsRequest<z.infer<T>>,
      context: { params: Promise<Record<string, string>> }
    ) => Promise<NextResponse>
  ) {
    return async (
      request: TRequest,
      context: { params: Promise<Record<string, string>> }
    ) => {
      // Await params (Next.js 15+ async params)
      const params = await context.params

      // Check for XSS
      if (opts.rejectXSS) {
        const xssField = findXSSField(params)
        if (xssField) {
          return NextResponse.json(
            {
              error: `Potentially malicious content detected in path parameter: ${xssField}`,
              code: VALIDATION_ERROR_CODES.XSS_DETECTED,
              field: xssField,
            },
            { status: 400 }
          )
        }
      }

      // Sanitize
      const sanitizedParams = opts.sanitize
        ? sanitizeObject(params, opts.sanitizeOptions)
        : params

      // Validate
      const result = schema.safeParse(sanitizedParams)

      if (!result.success) {
        return NextResponse.json(
          formatValidationError(result.error, VALIDATION_ERROR_CODES.INVALID_PARAMS),
          { status: 400 }
        )
      }

      // Attach validated data
      const validatedRequest = request as TRequest & ValidatedParamsRequest<z.infer<T>>
      validatedRequest.validatedParams = result.data

      return handler(validatedRequest, context)
    }
  }
}

/**
 * Combined body and query validation
 */
export function withValidation<TBody extends ZodSchema, TQuery extends ZodSchema>(
  bodySchema: TBody,
  querySchema: TQuery,
  options: ValidationOptions = {}
) {
  return function <TRequest extends NextRequest>(
    handler: (
      request: TRequest &
        ValidatedBodyRequest<z.infer<TBody>> &
        ValidatedQueryRequest<z.infer<TQuery>>
    ) => Promise<NextResponse>
  ) {
    return withQueryValidation(querySchema, options)(
      withBodyValidation(bodySchema, options)(handler) as (
        request: TRequest & ValidatedQueryRequest<z.infer<TQuery>>
      ) => Promise<NextResponse>
    )
  }
}

// ============================================
// COMMON VALIDATION SCHEMAS
// ============================================

/**
 * Common schema for pagination query parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Common schema for search query parameters
 */
export const searchSchema = z.object({
  search: z.string().max(200).optional(),
  q: z.string().max(200).optional(),
})

/**
 * Common schema for date range query parameters
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

/**
 * Common schema for sorting query parameters
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

/**
 * Combined common query schema (pagination + search + sort)
 */
export const commonQuerySchema = paginationSchema
  .merge(searchSchema)
  .merge(sortSchema)

/**
 * Schema for ID path parameter
 */
export const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
})

/**
 * Schema for UUID path parameter
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
})

/**
 * Schema for slug path parameter
 */
export const slugParamSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Invalid slug format"),
})

// ============================================
// ZOD CUSTOM REFINEMENTS
// ============================================

/**
 * Create a Zod string schema that sanitizes XSS
 */
export function safeString(options?: {
  min?: number
  max?: number
  message?: string
}) {
  let schema = z.string()

  if (options?.min !== undefined) {
    schema = schema.min(options.min, options.message)
  }
  if (options?.max !== undefined) {
    schema = schema.max(options.max, options.message)
  }

  return schema.transform((val) => sanitizeString(val))
}

/**
 * Create a Zod string schema that rejects XSS patterns
 */
export function noXSSString(options?: {
  min?: number
  max?: number
  message?: string
}) {
  let schema = z.string()

  if (options?.min !== undefined) {
    schema = schema.min(options.min, options.message)
  }
  if (options?.max !== undefined) {
    schema = schema.max(options.max, options.message)
  }

  return schema.refine(
    (val) => !containsXSS(val),
    {
      message: options?.message || "Input contains potentially malicious content",
    }
  )
}

/**
 * Schema for a safe email (sanitized)
 */
export const safeEmail = z.string().email().transform((val) => val.toLowerCase().trim())

/**
 * Schema for a safe URL
 */
export const safeUrl = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url)
      // Only allow http/https protocols
      return ["http:", "https:"].includes(parsed.protocol)
    } catch {
      return false
    }
  },
  { message: "Invalid URL or unsupported protocol" }
)

/**
 * Schema for a safe phone number
 */
export const safePhone = z.string().regex(
  /^[+]?[\d\s()-]{7,20}$/,
  "Invalid phone number format"
)

/**
 * Schema for positive price (USD)
 */
export const priceUsd = z.coerce.number().positive("Price must be positive")

/**
 * Schema for positive price (KHR)
 */
export const priceKhr = z.coerce.number().int().positive("Price must be positive")

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Find the first field that contains XSS patterns
 * @returns The field path or null if no XSS found
 */
function findXSSField(obj: Record<string, unknown>, prefix = ""): string | null {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key

    if (typeof value === "string" && containsXSS(value)) {
      return path
    }

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i]
        if (typeof item === "string" && containsXSS(item)) {
          return `${path}[${i}]`
        }
        if (typeof item === "object" && item !== null) {
          const found = findXSSField(item as Record<string, unknown>, `${path}[${i}]`)
          if (found) return found
        }
      }
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const found = findXSSField(value as Record<string, unknown>, path)
      if (found) return found
    }
  }

  return null
}

/**
 * Parse request body safely (returns null on failure)
 */
export async function safeParseBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: FormattedValidationError }> {
  try {
    const body = await request.json()
    const sanitized = sanitizeObject(body as Record<string, unknown>)
    const result = schema.safeParse(sanitized)

    if (!result.success) {
      return {
        success: false,
        error: formatValidationError(result.error, VALIDATION_ERROR_CODES.INVALID_BODY),
      }
    }

    return { success: true, data: result.data }
  } catch {
    return {
      success: false,
      error: {
        error: "Invalid JSON body",
        code: VALIDATION_ERROR_CODES.INVALID_JSON,
        details: [],
        summary: { fieldErrors: {}, formErrors: ["Invalid JSON body"] },
      },
    }
  }
}

/**
 * Parse query parameters safely
 */
export function safeParseQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: FormattedValidationError } {
  const searchParams = new URL(request.url).searchParams
  const query: Record<string, string | string[]> = {}

  for (const [key, value] of searchParams.entries()) {
    if (query[key] !== undefined) {
      if (Array.isArray(query[key])) {
        (query[key] as string[]).push(value)
      } else {
        query[key] = [query[key] as string, value]
      }
    } else {
      query[key] = value
    }
  }

  const sanitized = sanitizeObject(query)
  const result = schema.safeParse(sanitized)

  if (!result.success) {
    return {
      success: false,
      error: formatValidationError(result.error, VALIDATION_ERROR_CODES.INVALID_QUERY),
    }
  }

  return { success: true, data: result.data }
}
