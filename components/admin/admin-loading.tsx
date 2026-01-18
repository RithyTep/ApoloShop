"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface AdminLoadingProps {
  title: string
  subtitle?: string
  rows?: number
}

/**
 * Standard loading skeleton for admin pages.
 *
 * Usage:
 * ```tsx
 * if (isLoading) {
 *   return (
 *     <AdminLoading
 *       title="Customers"
 *       subtitle="View customer details and order history"
 *       rows={4}
 *     />
 *   )
 * }
 * ```
 */
export function AdminLoading({ title, subtitle, rows = 4 }: AdminLoadingProps) {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        )}
      </div>
      <Card className="p-6">
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    </div>
  )
}
