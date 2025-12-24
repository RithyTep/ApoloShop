# Feature: Shop Customizer (White Label)

> **Branch:** `Develop`
> **Status:** Complete
> **Last Updated:** 2025-12-24

---

## Overview

Visual page builder for customizing the shop frontend. Allows administrators to add, remove, reorder, and configure sections with a live preview. Supports desktop, tablet, and mobile preview modes.

---

## Usage

### Accessing the Customizer

1. Go to Admin Dashboard
2. Click "Shop Customizer" in the sidebar
3. Add/edit sections in the left panel
4. Preview changes in the right panel
5. Click "Save Changes" to publish

### Adding a Section

```typescript
// Sections available:
// - hero: Hero banner with image/video
// - promotions: Promotion cards grid
// - products: Product listing section
// - footer: Footer with links and social icons
```

---

## Components

| Component | Path | Description |
|-----------|------|-------------|
| `CustomizerPage` | `components/customizer/customizer-page.tsx` | Main customizer UI with drag-drop |
| `HeroEditor` | `components/customizer/editors/hero-editor.tsx` | Hero section settings |
| `PromotionsEditor` | `components/customizer/editors/promotions-editor.tsx` | Promotion cards editor |
| `ProductsEditor` | `components/customizer/editors/products-editor.tsx` | Product section settings |
| `FooterEditor` | `components/customizer/editors/footer-editor.tsx` | Footer configuration |
| `ThemeEditor` | `components/customizer/editors/theme-editor.tsx` | Theme/color settings |
| `HeroRenderer` | `components/customizer/renderers/hero-renderer.tsx` | Renders hero section |
| `PromotionsRenderer` | `components/customizer/renderers/promotions-renderer.tsx` | Renders promotions |
| `ProductsRenderer` | `components/customizer/renderers/products-renderer.tsx` | Renders products grid |
| `FooterRenderer` | `components/customizer/renderers/footer-renderer.tsx` | Renders footer |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/customizer` | Get active customization config |
| `PUT` | `/api/customizer` | Update/save customization config |

### Request/Response Examples

```json
// GET /api/customizer
{
  "config": {
    "theme": {
      "primaryColor": "oklch(0.72 0.16 356)",
      "accentColor": "oklch(0.72 0.16 356)",
      "backgroundColor": "oklch(1 0 0)",
      "textColor": "oklch(0.15 0 0)",
      "borderRadius": 0
    },
    "sections": [
      {
        "id": "hero-1",
        "type": "hero",
        "enabled": true,
        "order": 0,
        "config": { ... }
      }
    ]
  },
  "version": 1
}
```

```json
// PUT /api/customizer
{
  "config": { ... }
}
// Response: { "success": true, "version": 2 }
```

---

## Database Changes

### New Tables/Models

```prisma
model ShopCustomization {
  id        String   @id @default(cuid())
  version   Int      @default(1)
  isActive  Boolean  @default(true) @map("is_active")
  config    Json     // Full customization config
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([isActive])
  @@map("shop_customization")
  @@schema("apolo")
}
```

---

## Section Configurations

### Hero Banner
| Field | Type | Description |
|-------|------|-------------|
| `mediaType` | `image` \| `video` | Media type |
| `mediaUrl` | string | Image/video URL |
| `overlayOpacity` | number | Overlay opacity (0-100) |
| `overlayColor` | string | Overlay color |
| `titleEn` / `titleKh` | string | Title in EN/KH |
| `subtitleEn` / `subtitleKh` | string | Subtitle |
| `ctaTextEn` / `ctaTextKh` | string | Button text |
| `ctaLink` | string | Button link |
| `ctaStyle` | `primary` \| `secondary` \| `outline` | Button style |
| `textAlignment` | `left` \| `center` \| `right` | Text alignment |
| `height` | `small` \| `medium` \| `large` \| `full` | Section height |

### Promotions
| Field | Type | Description |
|-------|------|-------------|
| `titleEn` / `titleKh` | string | Section title |
| `columns` | 2 \| 3 \| 4 | Grid columns |
| `cards` | array | Promotion cards |

### Products
| Field | Type | Description |
|-------|------|-------------|
| `titleEn` / `titleKh` | string | Section title |
| `displayType` | `featured` \| `category` | Display mode |
| `categoryId` | string | Category filter (if category type) |
| `columns` | 2 \| 3 \| 4 | Grid columns |
| `maxProducts` | number | Max products to show |
| `showPrice` | boolean | Show prices |
| `showStock` | boolean | Show stock status |
| `showAddToCart` | boolean | Show add to cart button |

### Footer
| Field | Type | Description |
|-------|------|-------------|
| `backgroundColor` | string | Footer background |
| `textColor` | string | Footer text color |
| `columns` | array | Footer columns (links/text) |
| `copyrightEn` / `copyrightKh` | string | Copyright text |
| `showSocialIcons` | boolean | Show social icons |
| `socialLinks` | object | Facebook, Instagram, Telegram URLs |

---

## Dependencies

Uses existing packages:
- `@dnd-kit/core` - Drag and drop
- `@dnd-kit/sortable` - Sortable list
- `@tanstack/react-query` - Data fetching
- `@aws-sdk/client-s3` - Cloudflare R2 uploads

---

## Image Upload

All section editors now use the **ImageUpload** component for image management:

| Section | Folder | Description |
|---------|--------|-------------|
| Hero | `hero` | Hero banner images/videos |
| Promotions | `promotions` | Promotion card images |
| About | `about` | About section images |
| Team | `team` | Team member photos |
| Gallery | `gallery` | Gallery images |

### Features
- Drag and drop upload
- Click to browse
- Image preview
- Delete with automatic R2 cleanup
- Cloudflare CDN caching

See [Image Upload Documentation](./image-upload.md) for details.

---

## Related Files

- `components/customizer/customizer-page.tsx` - Main implementation
- `components/customizer/editors/*.tsx` - Section editors
- `components/customizer/renderers/*.tsx` - Section renderers
- `app/api/customizer/route.ts` - API endpoint
- `lib/api-hooks.ts` - React Query hooks
- `components/shop-app.tsx` - Shop integration
- `prisma/schema.prisma` - Database model

---

## Testing

1. Go to Admin Dashboard → Shop Customizer
2. Add a Hero section with image and title
3. Add a Products section
4. Toggle mobile/tablet/desktop preview
5. Drag sections to reorder
6. Click Save Changes
7. Visit /shop to see changes applied

---

## Testing

### E2E Tests (12 tests)
Located in `e2e/admin/customizer.spec.ts`:
- Load customizer page
- Show Sections and Theme tabs
- Add new section
- Edit section configuration
- Delete section
- Drag and drop reordering
- Theme editor
- Preview modes (desktop/tablet/mobile)
- Save changes

---

## Changelog

### 2025-12-24
- Replaced URL inputs with ImageUpload component
- Added Cloudflare R2 integration for image storage
- Images now have CDN caching via Cloudflare

### 2025-12-23
- Initial shop customizer implementation
- Added drag and drop section reordering
- Added preview modes
- Added theme editor

---

## Known Issues

- None currently

---

## Future Improvements

- [ ] Auto-save draft changes
- [ ] Undo/redo support
- [ ] Section templates/presets
- [ ] Custom CSS injection
- [ ] A/B testing support
