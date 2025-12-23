# Feature: [Feature Name]

> **Branch:** `Feature/[branch-name]`
> **Status:** [Draft | In Progress | Complete]
> **Last Updated:** YYYY-MM-DD

---

## Overview

[Brief description of what this feature does and why it was added.]

---

## Usage

### Basic Example

```typescript
// Code example showing how to use this feature
```

### Advanced Example

```typescript
// More complex usage scenario
```

---

## Components

| Component | Path | Description |
|-----------|------|-------------|
| `ComponentName` | `components/component-name.tsx` | Brief description |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/endpoint` | Description |
| `POST` | `/api/endpoint` | Description |

### Request/Response Examples

```json
// GET /api/endpoint
{
  "data": []
}
```

---

## Database Changes

### New Tables/Models

```prisma
// Prisma schema additions
model NewModel {
  id String @id @default(cuid())
}
```

### Migrations

- `YYYYMMDD_migration_name` - Description

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VAR_NAME` | Yes/No | `value` | Description |

### Settings

Any admin dashboard settings added.

---

## Dependencies

New packages added:

```bash
bun add package-name
```

---

## Related Files

- `path/to/main-file.tsx` - Main implementation
- `path/to/hook.ts` - Custom hook
- `path/to/api/route.ts` - API endpoint
- `docs/api/endpoint.md` - API documentation

---

## Testing

How to test this feature:

1. Step one
2. Step two
3. Expected result

---

## Known Issues

- [ ] Issue description (if any)

---

## Future Improvements

- [ ] Planned enhancement 1
- [ ] Planned enhancement 2
