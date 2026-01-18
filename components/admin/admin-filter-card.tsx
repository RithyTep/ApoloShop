"use client"

import { ReactNode } from "react"
import { Card } from "@/components/ui/card"

interface AdminFilterCardProps {
  children: ReactNode
  className?: string
}

/**
 * Standard filter card for admin pages.
 * Uses p-4 padding with flex layout by default.
 *
 * Usage:
 * ```tsx
 * <AdminFilterCard>
 *   <Input placeholder="Search..." className="max-w-md" />
 *   <div className="text-sm text-muted-foreground">
 *     10 items found
 *   </div>
 * </AdminFilterCard>
 * ```
 *
 * For grid layout, wrap children in a div with grid classes:
 * ```tsx
 * <AdminFilterCard>
 *   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 *     ...filters
 *   </div>
 * </AdminFilterCard>
 * ```
 */
export function AdminFilterCard({ children, className }: AdminFilterCardProps) {
  return (
    <Card className={`p-4 ${className || ""}`}>
      <div className="flex gap-4 items-center">
        {children}
      </div>
    </Card>
  )
}

interface AdminFilterCardGridProps {
  children: ReactNode
  columns?: 2 | 3 | 4
  className?: string
}

/**
 * Filter card with grid layout for multiple filters.
 *
 * Usage:
 * ```tsx
 * <AdminFilterCardGrid columns={4}>
 *   <Input placeholder="Search..." />
 *   <Select>...</Select>
 *   <Select>...</Select>
 *   <Button>Filter</Button>
 * </AdminFilterCardGrid>
 * ```
 */
export function AdminFilterCardGrid({
  children,
  columns = 4,
  className
}: AdminFilterCardGridProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  }

  return (
    <Card className={`p-4 ${className || ""}`}>
      <div className={`grid grid-cols-1 ${gridCols[columns]} gap-4`}>
        {children}
      </div>
    </Card>
  )
}
