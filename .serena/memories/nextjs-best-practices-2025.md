# Next.js 15/16 Best Practices Guide (2025)

A comprehensive guide compiled from authoritative sources for modern Next.js development.

## Sources

- [Best Practices for Organizing Your Next.js 15 (2025)](https://dev.to/bajrayejoon/best-practices-for-organizing-your-nextjs-15-2025-53ji)
- [Next.js Performance Optimization in 9 Steps](https://pagepro.co/blog/nextjs-performance-optimization-in-9-steps/)
- [18 Tips for Better React Code Review](https://pagepro.co/blog/18-tips-for-a-better-react-code-review-ts-js/)

---

## 1. Project Structure (App Router)

### Recommended Folder Organization

```
src/
├── app/                    # App Router pages and layouts
│   ├── (auth)/            # Route groups (no URL impact)
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── ui/                # Reusable UI components
│   ├── forms/             # Form components
│   └── layouts/           # Layout components
├── lib/                   # Utilities and helpers
│   ├── utils.ts
│   ├── constants.ts
│   └── types.ts
├── hooks/                 # Custom React hooks
├── services/              # API services and data fetching
└── styles/                # Global styles
```

### Key Principles

1. **Feature-based organization**: Group related files together
2. **Route groups**: Use `(groupName)` for logical grouping without URL changes
3. **Colocation**: Keep related files close to where they're used
4. **Barrel exports**: Use `index.ts` files for clean imports

---

## 2. Server vs Client Components

### Default to Server Components

Server Components are the default in App Router. Use them for:
- Data fetching
- Accessing backend resources
- Keeping sensitive info on server
- Large dependencies

### Use Client Components ("use client") For

- Interactivity (onClick, onChange)
- Browser APIs (localStorage, window)
- React hooks (useState, useEffect)
- Event listeners

### Best Practice: Push Client Components to Leaves

```tsx
// BAD: Entire page is client component
"use client"
export default function Dashboard() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <Header />           {/* Could be server */}
      <Sidebar />          {/* Could be server */}
      <Counter count={count} setCount={setCount} />
    </div>
  )
}

// GOOD: Only interactive part is client
// Dashboard (Server Component)
export default function Dashboard() {
  return (
    <div>
      <Header />
      <Sidebar />
      <Counter />  {/* Only this is "use client" */}
    </div>
  )
}
```

---

## 3. Image Optimization

### Always Use next/image

```tsx
// BAD
<img src="/hero.jpg" alt="Hero" />

// GOOD
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority           // For above-fold images
  loading="lazy"     // For below-fold images (default)
  placeholder="blur" // Optional blur placeholder
/>
```

### Benefits

- Automatic WebP/AVIF conversion
- Lazy loading by default
- Prevents Cumulative Layout Shift (CLS)
- Responsive images with `sizes` prop

### For SVG Icons

```tsx
<Image
  src="/icon.svg"
  alt=""
  width={16}
  height={16}
  style={{ imageRendering: "pixelated" }}  // For pixel art
/>
```

---

## 4. Font Optimization

### Use next/font

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
```

### Benefits

- Zero layout shift
- Self-hosted fonts (no external requests)
- Automatic subsetting

---

## 5. Performance Optimization

### 5.1 Resource Hints

```tsx
// app/layout.tsx
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
  <link rel="dns-prefetch" href="https://api.example.com" />
  <link rel="preload" href="/critical-image.png" as="image" />
</head>
```

### 5.2 Dynamic Imports

```tsx
import dynamic from 'next/dynamic'

// Heavy component loaded only when needed
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false  // Skip SSR for client-only components
})
```

### 5.3 Route Segment Config

```tsx
// app/dashboard/page.tsx
export const dynamic = 'force-static'  // or 'force-dynamic'
export const revalidate = 3600  // ISR: revalidate every hour
```

---

## 6. Data Fetching Patterns

### Server Components (Recommended)

```tsx
// app/posts/page.tsx
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 3600 }  // Cache for 1 hour
  })
  return res.json()
}

export default async function PostsPage() {
  const posts = await getPosts()
  return <PostList posts={posts} />
}
```

### Parallel Data Fetching

```tsx
export default async function Page() {
  // Parallel fetching - faster than sequential
  const [posts, users] = await Promise.all([
    getPosts(),
    getUsers()
  ])

  return (
    <>
      <PostList posts={posts} />
      <UserList users={users} />
    </>
  )
}
```

---

## 7. Code Review Checklist

### 7.1 Import Optimization (Tree Shaking)

```tsx
// BAD - imports entire library
import _ from 'lodash'
import * as Icons from 'lucide-react'

// GOOD - imports specific functions
import debounce from 'lodash/debounce'
import { Search, Menu } from 'lucide-react'
```

### 7.2 Boolean Naming Convention

Use prefixes for boolean variables:
- `is` - isLoading, isOpen, isValid
- `has` - hasError, hasData, hasPermission
- `should` - shouldFetch, shouldRender
- `can` - canSubmit, canEdit, canDelete

### 7.3 Extract Magic Numbers

```tsx
// BAD
setTimeout(callback, 5000)
if (items.length > 10) { ... }

// GOOD
const DEBOUNCE_DELAY_MS = 5000
const MAX_VISIBLE_ITEMS = 10

setTimeout(callback, DEBOUNCE_DELAY_MS)
if (items.length > MAX_VISIBLE_ITEMS) { ... }
```

### 7.4 Avoid Inline Styles for Animations

```tsx
// BAD - dangerouslySetInnerHTML for CSS
<style dangerouslySetInnerHTML={{ __html: `@keyframes...` }} />

// GOOD - CSS in globals.css or CSS modules
// globals.css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

---

## 8. TypeScript Best Practices

### Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

### Avoid `any`

```tsx
// BAD
function process(data: any) { ... }

// GOOD
function process(data: unknown) { ... }
function process<T extends Record<string, unknown>>(data: T) { ... }
```

### Use Satisfies for Type Inference

```tsx
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
} satisfies Config
```

---

## 9. Error Handling

### Error Boundaries

```tsx
// app/dashboard/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

### Loading States

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <Skeleton />
}
```

---

## 10. Security Best Practices

### Environment Variables

```bash
# .env.local (never commit)
DATABASE_URL=postgresql://...
API_SECRET=...

# Public variables (exposed to browser)
NEXT_PUBLIC_API_URL=https://api.example.com
```

### Server Actions Security

```tsx
'use server'

import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
})

export async function createUser(formData: FormData) {
  const validated = schema.parse({
    email: formData.get('email'),
    name: formData.get('name'),
  })

  // Safe to use validated data
}
```

---

## 11. Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

### Tools for Measurement

- Chrome DevTools Lighthouse
- PageSpeed Insights
- Web Vitals Chrome Extension
- `@next/bundle-analyzer`

---

## Quick Reference Checklist

- [ ] Use App Router (not Pages Router)
- [ ] Default to Server Components
- [ ] Push "use client" to leaf components
- [ ] Use next/image for all images
- [ ] Use next/font for fonts
- [ ] Add resource hints (preconnect, dns-prefetch)
- [ ] Enable TypeScript strict mode
- [ ] No `any` types
- [ ] Tree-shake imports (named imports)
- [ ] Extract magic numbers to constants
- [ ] Use proper boolean naming (is/has/should/can)
- [ ] Move CSS animations to stylesheets
- [ ] Implement error.tsx and loading.tsx
- [ ] Validate all user input (server-side)
- [ ] Keep secrets in server-only code
