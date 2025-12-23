# Check File Size

Check if any source files exceed the clean code line limits.

## Limits
- API Routes: 100 lines
- Services: 300 lines
- Components: 250 lines
- Utilities: 200 lines
- Types: 150 lines

## Instructions

1. Run these commands to find files exceeding limits:

```bash
# API routes > 100 lines
find app/api -name "route.ts" -exec wc -l {} \; | awk '$1 > 100 {print "⚠️ " $2 ": " $1 " lines (limit: 100)"}'

# Services > 300 lines
find server/services -name "*.ts" -exec wc -l {} \; | awk '$1 > 300 {print "⚠️ " $2 ": " $1 " lines (limit: 300)"}'

# Components > 250 lines
find components -name "*.tsx" -exec wc -l {} \; | awk '$1 > 250 {print "⚠️ " $2 ": " $1 " lines (limit: 250)"}'

# Lib files > 200 lines
find lib -name "*.ts" -exec wc -l {} \; | awk '$1 > 200 {print "⚠️ " $2 ": " $1 " lines (limit: 200)"}'
```

2. For any files that exceed limits, suggest refactoring:
   - API routes → Extract business logic to `server/services/`
   - Services → Split into focused services by feature
   - Components → Extract sub-components
   - Utilities → Split by domain/concern

3. Report findings and suggest specific refactoring actions.
