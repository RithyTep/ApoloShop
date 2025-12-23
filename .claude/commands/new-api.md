# Create New API Endpoint

Create a new API endpoint following clean code patterns.

## Arguments
- $FEATURE_NAME - Name of the feature (e.g., "user-profile")

## Instructions

1. **Create the service first** at `server/services/$FEATURE_NAME.service.ts`:
```typescript
/**
 * $FEATURE_NAME Service
 *
 * Business logic for $FEATURE_NAME feature.
 */

import { createLogger } from "@/lib/logger"

const logger = createLogger("$FEATURE_NAME")

export class ${FeatureName}Service {
  async process(input: unknown): Promise<unknown> {
    logger.info("Processing", { input })
    // TODO: Implement business logic
    return { success: true }
  }
}
```

2. **Export from index** - Add to `server/services/index.ts`:
```typescript
export { ${FeatureName}Service } from "./$FEATURE_NAME.service"
```

3. **Create the API route** at `app/api/$FEATURE_NAME/route.ts`:
```typescript
/**
 * $FEATURE_NAME API Route
 *
 * POST /api/$FEATURE_NAME
 */

import { ${FeatureName}Service } from "@/server/services"
import { apiSuccess, badRequest, handleApiError } from "@/lib/api"

const service = new ${FeatureName}Service()

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    if (!body) {
      return badRequest("Request body is required")
    }

    const result = await service.process(body)
    return apiSuccess({ result })
  } catch (error) {
    return handleApiError(error, "POST /api/$FEATURE_NAME")
  }
}
```

4. **Verify**:
   - Route file < 100 lines
   - Service file < 300 lines
   - Uses standardized API responses
   - Proper error handling
