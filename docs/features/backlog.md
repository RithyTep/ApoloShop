# Feature: Developer Backlog

> **Branch:** `Develop`
> **Status:** Complete
> **Last Updated:** 2025-12-24

---

## Overview

Kanban-style feature backlog for tracking development requirements. This feature is **only available in development environment** (`NODE_ENV === "development"`).

Provides a Jira-like board with three columns:
- **To Do** - Pending tasks
- **In Progress** - Currently being worked on
- **Done** - Completed tasks

---

## Usage

### Accessing the Backlog

1. Run the app in development mode: `bun dev`
2. Go to Admin Dashboard
3. Look for "Developer" section in sidebar (only visible in dev mode)
4. Click "Backlog"

### Managing Items

**Add Item:**
1. Click "Add Item" button
2. Fill in title, description, and priority
3. Click "Add Item"

**Edit Item:**
1. Click the edit icon on any card
2. Modify title, description, priority, or status
3. Click "Save Changes"

**Move Item:**
- Drag and drop cards between columns
- Or use the edit dialog to change status

**Delete Item:**
- Click the X icon on any card

---

## Components

| Component | Path | Description |
|-----------|------|-------------|
| `BacklogPage` | `components/pages/backlog-page.tsx` | Main Kanban board UI |

---

## Data Storage

Items are stored in the **PostgreSQL database** using Prisma ORM.

### Database Schema

```prisma
enum BacklogPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum BacklogStatus {
  TODO
  IN_PROGRESS
  DONE
}

model BacklogItem {
  id          String          @id @default(cuid())
  title       String
  description String?         @db.Text
  priority    BacklogPriority @default(MEDIUM)
  status      BacklogStatus   @default(TODO)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/backlog` | List all backlog items |
| `POST` | `/api/backlog` | Create new item |
| `PUT` | `/api/backlog/[id]` | Update item |
| `DELETE` | `/api/backlog/[id]` | Delete item |

### React Query Hooks

```typescript
import {
  useBacklogItems,
  useCreateBacklogItem,
  useUpdateBacklogItem,
  useDeleteBacklogItem,
} from "@/lib/api-hooks"
```

---

## Priority Levels

| Priority | Color | Badge |
|----------|-------|-------|
| Low | Slate | Gray badge |
| Medium | Blue | Blue badge |
| High | Orange | Orange badge |
| Critical | Red | Red badge |

---

## Environment Check

The "Developer" section only appears in the sidebar when:

```typescript
process.env.NODE_ENV === "development"
```

In production builds, this section is completely hidden.

---

## Related Files

- `components/pages/backlog-page.tsx` - Backlog page component
- `components/sidebar.tsx` - Developer section (dev-only)
- `components/admin-dashboard.tsx` - Backlog navigation
- `app/api/backlog/route.ts` - List/Create API
- `app/api/backlog/[id]/route.ts` - Update/Delete API
- `lib/api-hooks.ts` - React Query hooks
- `prisma/schema.prisma` - Database model

---

## Testing

### Manual Testing

1. Start dev server: `bun dev`
2. Go to `/admin`
3. Verify "Developer" section appears in sidebar
4. Click "Backlog"
5. Add a new item
6. Drag item to "In Progress"
7. Edit item priority
8. Delete item
9. Refresh page - verify items persist

### Production Check

1. Build for production: `bun run build`
2. Start production server: `bun start`
3. Verify "Developer" section does NOT appear in sidebar

---

## Changelog

### 2025-12-24
- Initial backlog feature implementation
- Added Kanban board with drag-and-drop
- Added priority levels (LOW, MEDIUM, HIGH, CRITICAL)
- **Database storage** with PostgreSQL via Prisma
- API endpoints for CRUD operations
- React Query hooks for data fetching
- Hidden in production environment

---

## Future Improvements

- [ ] Add labels/tags for items
- [ ] Add due dates
- [ ] Add search/filter functionality
- [ ] Export/import backlog items
- [ ] Sync with external issue tracker (GitHub, Linear)
