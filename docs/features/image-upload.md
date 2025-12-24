# Feature: Cloudflare R2 Image Upload

> **Branch:** `Develop`
> **Status:** Complete
> **Last Updated:** 2025-12-24

---

## Overview

Image upload system using Cloudflare R2 (S3-compatible storage). Provides a reusable drag-and-drop upload component used across the admin dashboard for products, promotions, hero banners, and more.

**Why R2?**
- Railway and Vercel have ephemeral filesystems
- R2 provides S3-compatible storage with Cloudflare CDN caching
- Cost-effective with generous free tier

---

## Setup

### 1. Create R2 Bucket

1. Go to Cloudflare Dashboard → R2
2. Create a new bucket (e.g., `apoloshop`)
3. Enable public access or create a custom domain

### 2. Create API Token

1. Go to R2 → Manage R2 API Tokens
2. Create token with "Object Read & Write" permissions
3. Copy the Access Key ID and Secret Access Key

### 3. Environment Variables

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=apoloshop
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

---

## Components

| Component | Path | Description |
|-----------|------|-------------|
| `ImageUpload` | `components/ui/image-upload.tsx` | Reusable drag-and-drop upload |
| R2 Client | `lib/r2.ts` | S3 client and utility functions |
| Upload API | `app/api/upload/route.ts` | Upload/delete endpoints |

---

## API Endpoints

### POST /api/upload

Upload an image to R2.

**Request:**
```typescript
// FormData with:
// - file: File (image/jpeg, image/png, image/webp, image/gif)
// - folder: string (optional, default: "uploads")

const formData = new FormData()
formData.append('file', file)
formData.append('folder', 'products')

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
})
```

**Response:**
```json
{
  "url": "https://your-bucket.r2.dev/products/1703123456-abc123.jpg",
  "key": "products/1703123456-abc123.jpg"
}
```

**Validation:**
- Max file size: 5MB
- Allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

### DELETE /api/upload

Delete an image from R2.

**Request:**
```json
DELETE /api/upload
{
  "key": "products/1703123456-abc123.jpg"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## ImageUpload Component

### Basic Usage

```tsx
import { ImageUpload } from '@/components/ui/image-upload'

function ProductForm() {
  const [imageUrl, setImageUrl] = useState('')

  return (
    <ImageUpload
      value={imageUrl}
      onChange={setImageUrl}
      folder="products"
    />
  )
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Current image URL |
| `onChange` | `(url: string) => void` | - | Callback when image changes |
| `folder` | `string` | `"uploads"` | R2 folder path |
| `className` | `string` | - | Additional CSS classes |

### Features

- Drag and drop support
- Click to browse files
- Image preview
- Delete button
- Loading state
- Error handling with toast notifications

---

## R2 Utility Functions

Located in `lib/r2.ts`:

### generateFileName

Generate unique filename with timestamp.

```typescript
import { generateFileName } from '@/lib/r2'

const fileName = generateFileName('photo.jpg')
// Returns: "1703123456789-a1b2c3.jpg"
```

### getPublicUrl

Get public URL for an image key.

```typescript
import { getPublicUrl } from '@/lib/r2'

const url = getPublicUrl('products/image.jpg')
// Returns: "https://your-bucket.r2.dev/products/image.jpg"
```

### uploadToR2

Upload file buffer to R2.

```typescript
import { uploadToR2 } from '@/lib/r2'

const { key, url } = await uploadToR2(
  buffer,       // File buffer
  'image.jpg',  // Filename
  'image/jpeg', // Content type
  'products'    // Folder
)
```

### deleteFromR2

Delete file from R2.

```typescript
import { deleteFromR2 } from '@/lib/r2'

await deleteFromR2('products/image.jpg')
```

### extractKeyFromUrl

Extract R2 key from public URL.

```typescript
import { extractKeyFromUrl } from '@/lib/r2'

const key = extractKeyFromUrl('https://bucket.r2.dev/products/image.jpg')
// Returns: "products/image.jpg"
```

---

## Usage in Admin Pages

The ImageUpload component is used in:

| Page | Folder | Description |
|------|--------|-------------|
| Products | `products` | Product images |
| Hero Editor | `hero` | Hero banner images |
| Promotions Editor | `promotions` | Promotion card images |
| About Editor | `about` | About section images |
| Team Editor | `team` | Team member photos |
| Gallery Editor | `gallery` | Gallery images |

---

## Caching

Images are served with Cloudflare CDN caching:
- Cache-Control: `public, max-age=31536000` (1 year)
- Automatic edge caching via Cloudflare

**Note:** Next.js image optimization is disabled (`unoptimized: true` in `next.config.mjs`) since R2 already has Cloudflare CDN caching.

---

## Testing

### Unit Tests (11 tests)

Located in `tests/unit/lib/r2.test.ts`:

- `generateFileName` - Unique filename generation
- `getPublicUrl` - URL construction
- `extractKeyFromUrl` - Key extraction from URLs

### Manual Testing

1. Go to Admin → Products
2. Click "Add Product"
3. Click on image upload area
4. Select an image file
5. Verify image uploads and previews
6. Save product and verify image URL is stored
7. Delete product and verify image is removed from R2

---

## Related Files

- `lib/r2.ts` - R2 client and utilities
- `app/api/upload/route.ts` - Upload/delete API
- `components/ui/image-upload.tsx` - Upload component
- `next.config.mjs` - Image optimization settings
- `.env.example` - Environment variables template

---

## Troubleshooting

### "Credential access key has length 40, should be 32"

You're using the wrong credentials. Create a new R2 API token:
1. Go to Cloudflare → R2 → Manage R2 API Tokens
2. Create new token with Object Read & Write permissions
3. Use the new Access Key ID (should be 32 characters)

### Images not loading in production

1. Ensure `R2_PUBLIC_URL` is set correctly
2. Check R2 bucket has public access enabled
3. Verify CORS settings if using custom domain

### Double URL encoding issues

This was fixed by setting `unoptimized: true` in `next.config.mjs`. Next.js image optimization was encoding URLs incorrectly for external images.

---

## Changelog

### 2025-12-24
- Initial R2 integration
- Created ImageUpload component
- Added upload/delete API endpoints
- Replaced URL inputs with upload component across admin
- Disabled Next.js image optimization (uses Cloudflare CDN instead)
