"use client"

import { Badge } from "@/components/ui/badge"
import { ReactNode } from "react"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

interface AdminBadgeProps {
  children: ReactNode
  variant?: BadgeVariant
}

/**
 * Standard badge for admin pages.
 * Always includes rounded-sm for consistent styling.
 *
 * Usage:
 * ```tsx
 * <AdminBadge variant="secondary">Active</AdminBadge>
 * <AdminBadge variant="destructive">Cancelled</AdminBadge>
 * ```
 *
 * Available variants:
 * - default: Primary color (for active/positive states)
 * - secondary: Muted (for tags, labels)
 * - destructive: Red (for errors, cancelled, rejected)
 * - outline: Border only (for neutral states)
 *
 * DO NOT use custom colors like "success", "warning", "info".
 * Use the standard variants above.
 */
export function AdminBadge({ children, variant = "secondary" }: AdminBadgeProps) {
  return (
    <Badge variant={variant} className="rounded-sm">
      {children}
    </Badge>
  )
}

/**
 * Status badge with predefined mappings.
 *
 * Usage:
 * ```tsx
 * <AdminStatusBadge status="active" />
 * <AdminStatusBadge status="pending" />
 * ```
 */
interface AdminStatusBadgeProps {
  status: "active" | "inactive" | "pending" | "completed" | "cancelled" | "rejected"
  labels?: Record<string, string>
}

const defaultLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
}

const statusVariants: Record<string, BadgeVariant> = {
  active: "default",
  inactive: "secondary",
  pending: "outline",
  completed: "default",
  cancelled: "destructive",
  rejected: "destructive",
}

export function AdminStatusBadge({ status, labels }: AdminStatusBadgeProps) {
  const label = labels?.[status] || defaultLabels[status] || status
  const variant = statusVariants[status] || "secondary"

  return (
    <Badge variant={variant} className="rounded-sm">
      {label}
    </Badge>
  )
}
