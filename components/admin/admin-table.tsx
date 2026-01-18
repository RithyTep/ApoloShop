"use client"

import { ReactNode } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * Pre-styled table components for admin pages.
 * These enforce consistent styling across all admin tables.
 */

interface AdminTableProps {
  children: ReactNode
}

export function AdminTable({ children }: AdminTableProps) {
  return <Table>{children}</Table>
}

interface AdminTableHeaderProps {
  children: ReactNode
}

export function AdminTableHeader({ children }: AdminTableHeaderProps) {
  return <TableHeader>{children}</TableHeader>
}

interface AdminTableHeadRowProps {
  children: ReactNode
}

/**
 * Standard table header row with border styling.
 */
export function AdminTableHeadRow({ children }: AdminTableHeadRowProps) {
  return (
    <TableRow className="border-b border-border">
      {children}
    </TableRow>
  )
}

interface AdminTableHeadProps {
  children: ReactNode
  className?: string
}

/**
 * Standard table head cell with consistent typography.
 */
export function AdminTableHead({ children, className }: AdminTableHeadProps) {
  return (
    <TableHead className={`text-foreground font-semibold ${className || ""}`}>
      {children}
    </TableHead>
  )
}

interface AdminTableBodyProps {
  children: ReactNode
}

export function AdminTableBody({ children }: AdminTableBodyProps) {
  return <TableBody>{children}</TableBody>
}

interface AdminTableRowProps {
  children: ReactNode
  className?: string
}

/**
 * Standard table row with hover state and border.
 */
export function AdminTableRow({ children, className }: AdminTableRowProps) {
  return (
    <TableRow className={`border-b border-border hover:bg-muted/50 ${className || ""}`}>
      {children}
    </TableRow>
  )
}

interface AdminTableCellProps {
  children: ReactNode
  className?: string
}

/**
 * Standard table cell.
 */
export function AdminTableCell({ children, className }: AdminTableCellProps) {
  return (
    <TableCell className={`text-foreground ${className || ""}`}>
      {children}
    </TableCell>
  )
}
