# White-Label Modules Implementation

## Overview
9 white-label modules for ApoloShop e-commerce customization.

---

## Sprint 1: Foundation ✅

### Module 1: Business Hours ✅
- [x] DB: `BusinessHours` model (dayOfWeek, openTime, closeTime, isOpen)
- [x] DB: `Holiday` model (date, nameEn/Kh, isFullDay, times)
- [x] API: `GET/PUT /api/business-hours` - Weekly schedule
- [x] API: `POST /api/business-hours` - Current status check
- [x] API: `GET/POST/PUT/DELETE /api/holidays` - Holiday CRUD
- [x] Admin: `business-hours-page.tsx` - Schedule + holiday management
- [x] Shop: `store-status.tsx` - Open/Closed badge in header
- [x] Sidebar: Added "Business Hours" nav item

### Module 2: Announcement Banner ✅
- [x] Types: `AnnouncementConfig` in api-hooks.ts
- [x] Editor: `announcement-editor.tsx` - Text, colors, scheduling
- [x] Renderer: `announcement-banner.tsx` - Dismissible, localStorage
- [x] Customizer: "Banner" tab integration
- [x] Shop: Integrated above header

### Module 6: Gallery/About Pages ✅
- [x] Types: `GalleryConfig`, `AboutConfig`, `TeamConfig`
- [x] Types: `GalleryImage`, `TeamMember`
- [x] Editor: `gallery-editor.tsx` - Image management
- [x] Editor: `about-editor.tsx` - Content + image position
- [x] Editor: `team-editor.tsx` - Member management
- [x] Renderer: `gallery-renderer.tsx` - Grid/masonry/carousel + lightbox
- [x] Renderer: `about-renderer.tsx` - Flexible layout
- [x] Renderer: `team-renderer.tsx` - Team grid
- [x] Customizer: Section types integration

---

## Sprint 2: Product Enhancement ⏳

### Module 3: Product Variants
- [ ] DB: `ProductVariantGroup` model
- [ ] DB: `ProductVariantOption` model
- [ ] DB: Update `OrderItem` with variants JSON
- [ ] API: `GET/POST/PUT/DELETE /api/products/[id]/variants`
- [ ] API: Update order creation for variants
- [ ] Admin: `product-variants-dialog.tsx`
- [ ] Shop: `variant-selector.tsx`
- [ ] Preset templates (coffee, food)

### Module 5: Reviews & Ratings
- [ ] DB: `ProductReview` model
- [ ] DB: Update `Product` with avgRating, reviewCount
- [ ] API: `GET/POST /api/products/[id]/reviews`
- [ ] API: `GET/PUT /api/reviews` - Admin moderation
- [ ] Admin: `reviews-page.tsx`
- [ ] Shop: `product-reviews.tsx`
- [ ] Shop: `review-form.tsx`
- [ ] Shop: `star-rating.tsx`

---

## Sprint 3: Customer Engagement ⏳

### Module 4: Loyalty/Rewards
- [ ] DB: `LoyaltyProgram` model
- [ ] DB: `LoyaltyTier` model
- [ ] DB: `CustomerLoyalty` model
- [ ] DB: `LoyaltyTransaction` model
- [ ] API: `GET/PUT /api/loyalty/program`
- [ ] API: `GET/POST /api/loyalty/tiers`
- [ ] API: `GET /api/customers/[id]/loyalty`
- [ ] API: `POST /api/loyalty/redeem`
- [ ] Admin: `loyalty-page.tsx`
- [ ] Shop: `loyalty-card.tsx`
- [ ] Order integration (earn points, stamps)

### Module 7: Order Notifications
- [ ] DB: `NotificationChannel` model
- [ ] DB: `NotificationTemplate` model
- [ ] API: `GET/PUT /api/notifications/channels`
- [ ] API: `GET/PUT /api/notifications/templates`
- [ ] API: `POST /api/notifications/test`
- [ ] Lib: `notifications.ts` - Send logic
- [ ] Admin: `notifications-page.tsx`
- [ ] Telegram bot integration
- [ ] Order/status hooks

---

## Sprint 4: Insights & Scale ⏳

### Module 8: Analytics Dashboard
- [ ] API: `GET /api/analytics/sales`
- [ ] API: `GET /api/analytics/products`
- [ ] API: `GET /api/analytics/customers`
- [ ] API: `GET /api/analytics/hours`
- [ ] Admin: `analytics-page.tsx`
- [ ] Components: `sales-chart.tsx`
- [ ] Components: `products-chart.tsx`
- [ ] Components: `hours-chart.tsx`

### Module 9: Multi-Branch
- [ ] DB: `Branch` model
- [ ] DB: `BranchInventory` model
- [ ] DB: Update `Order` with branchId
- [ ] API: `GET/POST/PUT/DELETE /api/branches`
- [ ] API: `GET/PUT /api/branches/[id]/inventory`
- [ ] API: `GET /api/branches/[id]/analytics`
- [ ] Admin: `branches-page.tsx`
- [ ] Shop: `branch-selector.tsx`
- [ ] Context: Branch selection state

---

## Progress Summary

| Sprint | Modules | Status |
|--------|---------|--------|
| 1 | Business Hours, Announcement, Gallery/About | ✅ Complete |
| 2 | Product Variants, Reviews | ⏳ Pending |
| 3 | Loyalty, Notifications | ⏳ Pending |
| 4 | Analytics, Multi-Branch | ⏳ Pending |

**Total: 3/9 modules complete (33%)**
