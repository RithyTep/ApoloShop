"use client"

interface AdminEmptyStateProps {
  message: string
}

/**
 * Simple empty state for admin tables/lists.
 * NO icons - just text, keeping it clean and consistent.
 *
 * Usage:
 * ```tsx
 * {items.length === 0 ? (
 *   <AdminEmptyState message="No customers found" />
 * ) : (
 *   <Table>...</Table>
 * )}
 * ```
 */
export function AdminEmptyState({ message }: AdminEmptyStateProps) {
  return (
    <div className="py-8 text-center text-muted-foreground">
      {message}
    </div>
  )
}
