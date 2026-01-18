"use client"

import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Eye, Pencil, Trash } from "lucide-react"

interface AdminActionButtonsProps {
  children: ReactNode
}

/**
 * Container for action buttons in table cells.
 * Provides consistent gap-2 spacing.
 *
 * Usage:
 * ```tsx
 * <AdminActionButtons>
 *   <AdminViewButton onClick={() => handleView(item)} />
 *   <AdminEditButton onClick={() => handleEdit(item)} />
 *   <AdminDeleteButton onClick={() => handleDelete(item)} />
 * </AdminActionButtons>
 * ```
 */
export function AdminActionButtons({ children }: AdminActionButtonsProps) {
  return (
    <div className="flex gap-2">
      {children}
    </div>
  )
}

interface ActionButtonProps {
  onClick: () => void
  disabled?: boolean
}

/**
 * Standard view button for admin tables.
 */
export function AdminViewButton({ onClick, disabled }: ActionButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs bg-transparent"
      onClick={onClick}
      disabled={disabled}
    >
      <Eye size={14} />
    </Button>
  )
}

/**
 * Standard edit button for admin tables.
 */
export function AdminEditButton({ onClick, disabled }: ActionButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs bg-transparent"
      onClick={onClick}
      disabled={disabled}
    >
      <Pencil size={14} />
    </Button>
  )
}

/**
 * Standard delete button for admin tables.
 */
export function AdminDeleteButton({ onClick, disabled }: ActionButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs text-destructive hover:text-destructive bg-transparent"
      onClick={onClick}
      disabled={disabled}
    >
      <Trash size={14} />
    </Button>
  )
}

interface AdminActionButtonProps {
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: "default" | "destructive"
}

/**
 * Custom action button with any icon.
 *
 * Usage:
 * ```tsx
 * <AdminActionButton
 *   icon={<Check size={14} />}
 *   onClick={() => handleApprove(item)}
 * />
 * ```
 */
export function AdminActionButton({
  icon,
  onClick,
  disabled,
  variant = "default"
}: AdminActionButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={`text-xs bg-transparent ${
        variant === "destructive" ? "text-destructive hover:text-destructive" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </Button>
  )
}
