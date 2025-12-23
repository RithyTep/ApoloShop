"use client"

import {
  LayoutDashboard,
  Package,
  List,
  Users,
  Boxes,
  CreditCard,
  Tag,
  FileText,
  User,
  BarChart3,
  Settings,
  ShoppingCart,
  Menu,
  X,
} from "phosphor-react"
import { useState } from "react"

type NavItem =
  | "dashboard"
  | "orders"
  | "products"
  | "categories"
  | "customers"
  | "inventory"
  | "payments"
  | "promotions"
  | "content"
  | "users"
  | "reports"
  | "settings"

interface SidebarProps {
  activeNav: NavItem
  setActiveNav: (item: NavItem) => void
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: List },
  { id: "customers", label: "Customers", icon: Users },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "promotions", label: "Promotions", icon: Tag },
  { id: "content", label: "Content", icon: FileText },
  { id: "users", label: "Users & Roles", icon: User },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
]

export function Sidebar({ activeNav, setActiveNav }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <>
      {/* Toggle button for mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 hover:bg-muted rounded"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed md:relative z-40 w-64 h-screen bg-sidebar border-r border-sidebar-border
          transition-transform duration-300 md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground">Shop CMS</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon as any
            const isActive = activeNav === item.id

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id as NavItem)
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded text-left
                  transition-colors duration-200
                  ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }
                `}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/60">Logged in as Admin</div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 md:hidden z-30" onClick={() => setIsOpen(false)} />}
    </>
  )
}
