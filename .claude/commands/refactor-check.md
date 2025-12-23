# Refactor Check

Analyze code quality and suggest refactoring opportunities.

## Instructions

1. **Check file sizes** against limits:
   - API Routes: MAX 100 lines
   - Services: MAX 300 lines
   - Components: MAX 250 lines
   - Utilities: MAX 200 lines

2. **Check for code smells**:
   - Business logic in API routes (should be in services)
   - Duplicated code across files
   - Mixed concerns in single file
   - Deep nesting (> 3 levels)
   - Long functions (> 50 lines)
   - Many parameters (> 4)
   - `any` types (should be `unknown` or proper type)
   - `console.log` (should use logger)

3. **Check architecture violations**:
   - API routes should only do: request parsing, validation, response formatting
   - Services should contain: business logic, orchestration
   - Repositories should contain: data access only
   - Lib should contain: shared utilities, external API clients

4. **Report format**:
   ```
   ## File: path/to/file.ts
   - Lines: X (limit: Y)
   - Issues found:
     - [ ] Issue 1
     - [ ] Issue 2
   - Suggested refactoring:
     - Action 1
     - Action 2
   ```

5. **Priority order**:
   - P1: Files over line limit
   - P2: Architecture violations
   - P3: Code smells
   - P4: Style improvements
