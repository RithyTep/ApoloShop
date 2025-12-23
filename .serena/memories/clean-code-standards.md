# Clean Code Standards 2025

Quick reference for AI agents. Based on latest research from Clean Code, Bulletproof React, and 2025 industry standards.

## Critical Limits

| Type | Max Lines | Max Functions | Max Params |
|------|-----------|---------------|------------|
| API Route | **80** | 3 | 4 |
| Service | **250** | 10 | 4 |
| Component | **200** | 5 | 4 |
| Hook | **100** | 3 | 4 |
| Utility | **150** | 8 | 4 |
| Function | **30** | - | 4 |

## Before Adding Code

```
1. Check current file line count
2. If > 80% of limit → refactor first
3. Follow existing patterns
4. Don't mix concerns
```

## SOLID Quick Reference

- **S**: One responsibility per file/class/function
- **O**: Extend via composition, not modification
- **L**: Components sharing interface are swappable
- **I**: Props should only include what's needed
- **D**: Depend on interfaces, not implementations

## Import Order

```typescript
// 1. React/Next
// 2. External packages
// 3. Internal (@/)
// 4. Relative
```

## Sources

- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [Clean Code TypeScript](https://github.com/labs42io/clean-code-typescript)
- [Rule of 30](https://dzone.com/articles/rule-30-–-when-method-class-or)
- [Feature-Sliced Design](https://feature-sliced.design/)
