# Feature: Input Validation Middleware

> **Branch:** `Feature/product-search`
> **Status:** Complete
> **Last Updated:** 2026-01-12

---

## Overview

Centralized request validation middleware using Zod. Provides type-safe validation for request body, query parameters, and path parameters with built-in XSS sanitization to prevent injection attacks.

---

## Usage

### Basic Body Validation

```typescript
import { withBodyValidation } from "@/lib/validation"
import { z } from "zod"

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  age: z.number().int().positive().optional(),
})

export const POST = withBodyValidation(createUserSchema)(async (request) => {
  // Type-safe access to validated data
  const { name, email, age } = request.validatedBody

  // name is string, email is string, age is number | undefined
  return NextResponse.json({ success: true })
})
```

### Query Parameter Validation

```typescript
import { withQueryValidation, paginationSchema } from "@/lib/validation"
import { z } from "zod"

const listQuerySchema = paginationSchema.extend({
  categoryId: z.string().optional(),
  search: z.string().max(100).optional(),
})

export const GET = withQueryValidation(listQuerySchema)(async (request) => {
  const { page, limit, categoryId, search } = request.validatedQuery

  // page defaults to 1, limit defaults to 20
  return NextResponse.json({ page, limit })
})
```

### Path Parameter Validation

```typescript
import { withParamsValidation, uuidParamSchema } from "@/lib/validation"

export const GET = withParamsValidation(uuidParamSchema)(
  async (request, { params }) => {
    const { id } = request.validatedParams
    // id is guaranteed to be a valid UUID
    return NextResponse.json({ id })
  }
)
```

### Combined Validation

```typescript
import { withValidation } from "@/lib/validation"
import { z } from "zod"

const bodySchema = z.object({
  name: z.string().min(1),
})

const querySchema = z.object({
  dryRun: z.coerce.boolean().default(false),
})

export const POST = withValidation(bodySchema, querySchema)(async (request) => {
  const { name } = request.validatedBody
  const { dryRun } = request.validatedQuery

  return NextResponse.json({ name, dryRun })
})
```

### XSS Sanitization Utilities

```typescript
import { sanitizeString, containsXSS, sanitizeObject } from "@/lib/validation"

// Sanitize a single string
const clean = sanitizeString('<script>alert("xss")</script>Hello')
// Result: "Hello"

// Check for XSS patterns
if (containsXSS(userInput)) {
  throw new Error("XSS detected")
}

// Sanitize all strings in an object
const sanitized = sanitizeObject({
  name: '<img onerror="alert(1)">John',
  email: 'john@example.com',
})
// Result: { name: "John", email: "john@example.com" }
```

### Safe String Schemas

```typescript
import { safeString, noXSSString, safeEmail, safeUrl } from "@/lib/validation"

const schema = z.object({
  // Auto-sanitizes XSS patterns
  name: safeString({ min: 1, max: 100 }),

  // Rejects if XSS patterns found
  bio: noXSSString({ max: 500 }),

  // Lowercased and trimmed email
  email: safeEmail,

  // Only allows http/https URLs
  website: safeUrl.optional(),
})
```

---

## Components

| Component | Path | Description |
|-----------|------|-------------|
| `validation.ts` | `lib/validation.ts` | Core validation middleware and utilities |

---

## API Endpoints

No new endpoints. This feature provides middleware for existing endpoints.

### Error Response Format

All validation errors return a 400 status with this structure:

```json
{
  "error": "Validation failed",
  "code": "INVALID_BODY",
  "details": [
    {
      "field": "email",
      "message": "Invalid email",
      "code": "invalid_string"
    }
  ],
  "summary": {
    "fieldErrors": {
      "email": ["Invalid email"]
    },
    "formErrors": []
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_BODY` | Request body validation failed |
| `INVALID_QUERY` | Query parameter validation failed |
| `INVALID_PARAMS` | Path parameter validation failed |
| `BODY_REQUIRED` | Missing required request body |
| `INVALID_JSON` | Could not parse JSON body |
| `XSS_DETECTED` | Potentially malicious content detected |

---

## Database Changes

No database changes required.

---

## Configuration

### Validation Options

```typescript
interface ValidationOptions {
  /** Sanitize string inputs (default: true) */
  sanitize?: boolean
  /** Sanitization options */
  sanitizeOptions?: {
    stripTags?: boolean      // Remove HTML tags (default: true)
    encodeEntities?: boolean // HTML entity encode (default: false)
    trim?: boolean           // Trim whitespace (default: true)
    maxLength?: number       // Max string length
  }
  /** Reject requests with XSS patterns (default: true) */
  rejectXSS?: boolean
}
```

---

## Dependencies

Uses existing Zod package (already installed):

```json
{
  "dependencies": {
    "zod": "^3.x"
  }
}
```

---

## Related Files

- `lib/validation.ts` - Main implementation
- `lib/auth-middleware.ts` - Works alongside auth middleware

---

## Testing

1. Send a POST request with invalid body:
   ```bash
   curl -X POST /api/products -d '{"name": ""}' -H "Content-Type: application/json"
   ```
   Expected: 400 response with validation error

2. Send a request with XSS payload:
   ```bash
   curl -X POST /api/products -d '{"name": "<script>alert(1)</script>"}' -H "Content-Type: application/json"
   ```
   Expected: 400 response with XSS_DETECTED error

3. Send a valid request:
   ```bash
   curl -X POST /api/products -d '{"name": "Coffee", "price": 5.99}' -H "Content-Type: application/json"
   ```
   Expected: 201 success response

---

## Known Issues

- None

---

## Future Improvements

- [ ] Add rate limiting per validation schema
- [ ] Add request logging for validation failures
- [ ] Support file upload validation
- [ ] Add async schema validation for database uniqueness checks
