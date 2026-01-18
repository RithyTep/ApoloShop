"use client"

import { ReactNode } from "react"
import { Card } from "@/components/ui/card"

interface AdminDataCardProps {
  children: ReactNode
  className?: string
}

/**
 * Standard data card for admin pages (tables, lists).
 * Uses p-6 padding with overflow-x-auto for responsive tables.
 *
 * Usage:
 * ```tsx
 * <AdminDataCard>
 *   <Table>
 *     ...
 *   </Table>
 * </AdminDataCard>
 * ```
 */
export function AdminDataCard({ children, className }: AdminDataCardProps) {
  return (
    <Card className={`p-6 ${className || ""}`}>
      <div className="overflow-x-auto">
        {children}
      </div>
    </Card>
  )
}
