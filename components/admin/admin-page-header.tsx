"use client"

import { ReactNode } from "react"

interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  children?: ReactNode // For action buttons on the right
}

/**
 * Standard admin page header component.
 *
 * Usage:
 * ```tsx
 * <AdminPageHeader
 *   title="Customers"
 *   subtitle="View customer details and order history"
 * >
 *   <Button>Add Customer</Button>
 * </AdminPageHeader>
 * ```
 *
 * DO NOT add icons to the title - keep it clean and simple.
 */
export function AdminPageHeader({ title, subtitle, children }: AdminPageHeaderProps) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}
