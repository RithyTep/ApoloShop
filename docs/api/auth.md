# Authentication API

## POST /api/auth/login

Login and receive auth cookie.

**Request:**
```json
{
  "email": "admin@apolodev.com",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "clx...",
    "email": "admin@apolodev.com",
    "name": "Admin User",
    "role": "admin",
    "permissions": { ... }
  }
}
```
Sets `auth-token` cookie (HTTP-only, 7 days).

**Error (401):**
```json
{ "error": "Invalid credentials" }
```

---

## POST /api/auth/logout

Clear session and cookie.

**Response (200):**
```json
{ "success": true }
```

---

## GET /api/auth/session

Get current authenticated user.

**Response (authenticated):**
```json
{
  "authenticated": true,
  "user": {
    "id": "clx...",
    "email": "admin@apolodev.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

**Response (not authenticated):**
```json
{ "authenticated": false, "user": null }
```

---

## Usage in Components

```tsx
import { useSession, useLogin, useLogout } from '@/lib/api-hooks'

function LoginForm() {
  const login = useLogin()

  const handleSubmit = async () => {
    await login.mutateAsync({ email, password })
    window.location.href = '/admin'
  }
}

function AdminPage() {
  const { data: session, isLoading } = useSession()

  if (!session?.authenticated) {
    redirect('/admin/login')
  }
}
```
