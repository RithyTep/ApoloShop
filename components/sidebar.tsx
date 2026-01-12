"use client"

import {
  LayoutDashboard,
  Package,
  FolderTree,
  Users,
  Boxes,
  CreditCard,
  Gift,
  FileText,
  UserCog,
  BarChart3,
  Settings,
  ShoppingBag,
  Menu,
  X,
  Palette,
  Clock,
  ClipboardList,
  MessageSquare,
  Building2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Activity,
  HelpCircle,
  Truck,
  MapPin,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

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
  | "customizer"
  | "business-hours"
  | "backlog"
  | "reviews"
  | "super-admin"
  | "audit-logs"
  | "role-permissions"
  | "security-dashboard"
  | "flash-sales"
  | "performance"
  | "chat"
  | "help-center"
  | "shipping-zones"
  | "order-tracking"
  | "analytics"

interface SidebarProps {
  activeNav: NavItem
  setActiveNav: (item: NavItem) => void
  orderCount?: number
  lowStockCount?: number
  reviewCount?: number
}

interface NavItemConfig {
  id: NavItem
  label: string
  icon: LucideIcon
  badge?: number
  alert?: boolean
}

interface NavGroup {
  label?: string
  items: NavItemConfig[]
}

export function Sidebar({ activeNav, setActiveNav, orderCount = 0, lowStockCount = 0, reviewCount = 0 }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)

  const navGroups: NavGroup[] = [
    {
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Sales",
      items: [
        { id: "orders", label: "Orders", icon: ShoppingBag, badge: orderCount > 0 ? orderCount : undefined },
        { id: "order-tracking", label: "Order Tracking", icon: MapPin },
        { id: "customers", label: "Customers", icon: Users },
        { id: "shipping-zones", label: "Shipping Zones", icon: Truck },
        { id: "reviews", label: "Reviews", icon: MessageSquare, badge: reviewCount > 0 ? reviewCount : undefined },
        { id: "chat", label: "Live Chat", icon: MessageSquare },
        { id: "help-center", label: "Help Center", icon: HelpCircle },
      ],
    },
    {
      label: "Catalog",
      items: [
        { id: "products", label: "Products", icon: Package },
        { id: "categories", label: "Categories", icon: FolderTree },
        { id: "inventory", label: "Inventory", icon: Boxes, alert: lowStockCount > 0 },
      ],
    },
    {
      label: "Marketing",
      items: [
        { id: "flash-sales", label: "Flash Sales", icon: Zap },
        { id: "promotions", label: "Promotions", icon: Gift },
        { id: "content", label: "Content", icon: FileText },
        { id: "customizer", label: "Customizer", icon: Palette },
      ],
    },
    {
      label: "System",
      items: [
        { id: "business-hours", label: "Business Hours", icon: Clock },
        { id: "users", label: "Users", icon: UserCog },
        { id: "role-permissions", label: "Role Permissions", icon: ShieldCheck },
        { id: "payments", label: "Payments", icon: CreditCard },
        { id: "reports", label: "Reports", icon: BarChart3 },
        { id: "analytics", label: "Analytics", icon: TrendingUp },
        { id: "performance", label: "Performance", icon: Activity },
        { id: "security-dashboard", label: "Security", icon: ShieldAlert },
        { id: "audit-logs", label: "Audit Logs", icon: Shield },
        { id: "settings", label: "Settings", icon: Settings },
      ],
    },
    // Developer section - only in development mode
    ...(process.env.NODE_ENV === "development"
      ? [
          {
            label: "Developer",
            items: [
              { id: "backlog" as NavItem, label: "Backlog", icon: ClipboardList },
              { id: "super-admin" as NavItem, label: "Super Admin", icon: Building2 },
            ],
          },
        ]
      : []),
  ]

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
        className={cn(
          "fixed md:relative z-40 w-56 h-screen bg-sidebar border-r border-sidebar-border",
          "transition-transform duration-300 md:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-sidebar-border">
          <h1 className="text-base font-semibold text-sidebar-foreground">ApoloShop</h1>
          <p className="text-xs text-sidebar-foreground/50">Admin Panel</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex} className={cn(group.label && "mt-4 first:mt-0")}>
              {/* Section Header */}
              {group.label && (
                <div className="px-5 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    {group.label}
                  </span>
                </div>
              )}

              {/* Items */}
              <div className="px-2 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeNav === item.id

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveNav(item.id)
                        setIsOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-left",
                        "transition-colors duration-150",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} strokeWidth={1.75} />
                        <span className="text-sm">{item.label}</span>
                      </div>

                      {/* Badge or Alert */}
                      {item.badge && (
                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-medium rounded-full bg-primary text-primary-foreground">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                      {item.alert && !item.badge && (
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/50">Admin</div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
