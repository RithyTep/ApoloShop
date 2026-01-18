# Admin UI Style Guide

This document defines the standard UI patterns for all admin pages in ApoloShop.
Use the shared components in `components/admin/` to ensure consistency.

## Quick Reference

| Element | Standard | Component |
|---------|----------|-----------|
| Page Header | No icon, plain text | `AdminPageHeader` |
| Root Layout | `p-8 space-y-6` | Manual |
| Filter Section | `p-4`, flex/grid | `AdminFilterCard` |
| Data Section | `p-6`, overflow-x-auto | `AdminDataCard` |
| Table Header | `border-b`, `font-semibold` | `AdminTableHeadRow` |
| Table Row | `border-b`, `hover:bg-muted/50` | `AdminTableRow` |
| Badges | `rounded-sm`, standard variants | `AdminBadge` |
| Action Buttons | `outline`, `size="sm"`, `bg-transparent` | `AdminActionButtons` |
| Empty State | Simple text only, NO icons | `AdminEmptyState` |
| Loading | Skeleton in Card | `AdminLoading` |

---

## Components Usage

### 1. Page Header

```tsx
import { AdminPageHeader } from "@/components/admin"

<AdminPageHeader
  title="Customers"
  subtitle="View customer details and order history"
>
  <Button>Add Customer</Button>
</AdminPageHeader>
```

**Rules:**
- NO icons in the title
- Keep subtitle concise
- Action buttons go as children (right side)

---

### 2. Filter Card

```tsx
import { AdminFilterCard, AdminFilterCardGrid } from "@/components/admin"

// Simple flex layout
<AdminFilterCard>
  <Input placeholder="Search..." className="max-w-md" />
  <div className="text-sm text-muted-foreground">10 items</div>
</AdminFilterCard>

// Grid layout for multiple filters
<AdminFilterCardGrid columns={4}>
  <Input placeholder="Search..." />
  <Select>...</Select>
  <Select>...</Select>
  <Button>Filter</Button>
</AdminFilterCardGrid>
```

---

### 3. Data Card (Table Container)

```tsx
import { AdminDataCard } from "@/components/admin"

<AdminDataCard>
  <Table>...</Table>
</AdminDataCard>
```

---

### 4. Table Components

```tsx
import {
  AdminTable,
  AdminTableHeader,
  AdminTableHeadRow,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
} from "@/components/admin"

<AdminTable>
  <AdminTableHeader>
    <AdminTableHeadRow>
      <AdminTableHead>Name</AdminTableHead>
      <AdminTableHead>Status</AdminTableHead>
      <AdminTableHead>Actions</AdminTableHead>
    </AdminTableHeadRow>
  </AdminTableHeader>
  <AdminTableBody>
    {items.map((item) => (
      <AdminTableRow key={item.id}>
        <AdminTableCell>{item.name}</AdminTableCell>
        <AdminTableCell>
          <AdminBadge>Active</AdminBadge>
        </AdminTableCell>
        <AdminTableCell>
          <AdminActionButtons>
            <AdminEditButton onClick={() => handleEdit(item)} />
          </AdminActionButtons>
        </AdminTableCell>
      </AdminTableRow>
    ))}
  </AdminTableBody>
</AdminTable>
```

---

### 5. Action Buttons

```tsx
import {
  AdminActionButtons,
  AdminViewButton,
  AdminEditButton,
  AdminDeleteButton,
  AdminActionButton,
} from "@/components/admin"

<AdminActionButtons>
  <AdminViewButton onClick={() => setViewItem(item)} />
  <AdminEditButton onClick={() => setEditItem(item)} />
  <AdminDeleteButton onClick={() => setDeleteItem(item)} />
</AdminActionButtons>

// Custom action button
<AdminActionButton
  icon={<Check size={14} />}
  onClick={() => handleApprove(item)}
/>
```

---

### 6. Badges

```tsx
import { AdminBadge, AdminStatusBadge } from "@/components/admin"

// Manual variant
<AdminBadge variant="secondary">VIP</AdminBadge>
<AdminBadge variant="destructive">Cancelled</AdminBadge>

// Status badge (auto variant)
<AdminStatusBadge status="active" />
<AdminStatusBadge status="pending" />
```

**Available Variants:**
- `default` - Primary color (active/positive)
- `secondary` - Muted (tags, labels)
- `destructive` - Red (errors, cancelled)
- `outline` - Border only (neutral)

**DO NOT USE:** Custom colors like `success`, `warning`, `info`

---

### 7. Empty State

```tsx
import { AdminEmptyState } from "@/components/admin"

{items.length === 0 ? (
  <AdminEmptyState message="No customers found" />
) : (
  <Table>...</Table>
)}
```

**Rules:**
- NO icons
- Simple text message only
- Keep it brief

---

### 8. Loading State

```tsx
import { AdminLoading } from "@/components/admin"

if (isLoading) {
  return (
    <AdminLoading
      title="Customers"
      subtitle="View customer details and order history"
      rows={4}
    />
  )
}
```

---

## Complete Page Example

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AdminPageHeader,
  AdminFilterCard,
  AdminDataCard,
  AdminTable,
  AdminTableHeader,
  AdminTableHeadRow,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminActionButtons,
  AdminEditButton,
  AdminDeleteButton,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"

export function ExamplePage() {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useData()

  if (isLoading) {
    return (
      <AdminLoading
        title="Example"
        subtitle="Manage your items"
      />
    )
  }

  const items = data?.items || []

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Example"
        subtitle="Manage your items"
      >
        <Button>Add Item</Button>
      </AdminPageHeader>

      <AdminFilterCard>
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="text-sm text-muted-foreground">
          {items.length} items
        </div>
      </AdminFilterCard>

      <AdminDataCard>
        {items.length === 0 ? (
          <AdminEmptyState message="No items found" />
        ) : (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeadRow>
                <AdminTableHead>Name</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Actions</AdminTableHead>
              </AdminTableHeadRow>
            </AdminTableHeader>
            <AdminTableBody>
              {items.map((item) => (
                <AdminTableRow key={item.id}>
                  <AdminTableCell className="font-medium">
                    {item.name}
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge variant="secondary">
                      {item.status}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminActionButtons>
                      <AdminEditButton onClick={() => handleEdit(item)} />
                      <AdminDeleteButton onClick={() => handleDelete(item)} />
                    </AdminActionButtons>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminDataCard>
    </div>
  )
}
```

---

## Dialog Standards

| Dialog Type | Width |
|-------------|-------|
| Simple form (4-5 fields) | `sm:max-w-[400px]` |
| Standard form | `sm:max-w-[450px]` |
| Complex form | `sm:max-w-[600px]` |
| View details | `sm:max-w-[550px]` |

---

## What NOT to Do

1. **NO icons in page titles**
   ```tsx
   // BAD
   <h1 className="flex items-center gap-3">
     <Truck className="h-7 w-7" />
     Shipping Zones
   </h1>

   // GOOD
   <AdminPageHeader title="Shipping Zones" />
   ```

2. **NO custom badge colors**
   ```tsx
   // BAD
   <Badge variant="warning">Pending</Badge>
   <Badge variant="success">Active</Badge>
   <Badge variant="info">Processing</Badge>

   // GOOD
   <AdminBadge variant="outline">Pending</AdminBadge>
   <AdminBadge variant="default">Active</AdminBadge>
   <AdminBadge variant="secondary">Processing</AdminBadge>
   ```

3. **NO complex empty states with icons**
   ```tsx
   // BAD
   <div className="p-12 text-center">
     <MessageSquare className="h-12 w-12 mx-auto mb-4" />
     <h3>No Reviews Found</h3>
     <p>No reviews have been submitted yet.</p>
   </div>

   // GOOD
   <AdminEmptyState message="No reviews found" />
   ```

4. **NO ghost/icon action buttons**
   ```tsx
   // BAD
   <Button variant="ghost" size="icon">
     <Pencil className="h-4 w-4" />
   </Button>

   // GOOD
   <AdminEditButton onClick={handleEdit} />
   ```

---

## Migration Checklist

When updating existing pages:

- [ ] Replace header with `AdminPageHeader` (remove icons)
- [ ] Replace filter section with `AdminFilterCard`
- [ ] Replace table container with `AdminDataCard`
- [ ] Replace table components with Admin* versions
- [ ] Replace action buttons with `AdminActionButtons`
- [ ] Replace badges with `AdminBadge` (fix variants)
- [ ] Replace empty state with `AdminEmptyState` (remove icons)
- [ ] Replace loading state with `AdminLoading`
- [ ] Remove any custom colors (warning, success, info)
- [ ] Update dialog widths to standard sizes

---

*Last updated: 2025-01-18*
