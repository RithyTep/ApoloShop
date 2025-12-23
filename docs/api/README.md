# API Reference

> Base URL: `/api`

## Endpoints

| Endpoint | Description |
|----------|-------------|
| [/api/auth/*](./auth.md) | Authentication |
| [/api/products](./products.md) | Products CRUD |
| [/api/categories](./products.md#categories) | Categories CRUD |
| [/api/orders](./orders.md) | Order management |
| [/api/customers](./customers.md) | Customer management |
| [/api/payments](./payments.md) | Payment processing |
| [/api/inventory](./products.md#inventory) | Stock tracking |
| [/api/settings](./settings.md) | Shop settings |
| [/api/export](./export.md) | Data export |

## Response Format

```typescript
// Success
{ data: T }

// Error
{ error: string, details?: object }
```

## Authentication

Most endpoints require auth cookie. Set via `/api/auth/login`.

```typescript
// Cookie: auth-token (HTTP-only, 7 days)
```
