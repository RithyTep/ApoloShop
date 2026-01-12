"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { DashboardPage } from "./pages/dashboard-page"
import { OrdersPage } from "./pages/orders-page"
import { ProductsPage } from "./pages/products-page"
import { CategoriesPage } from "./pages/categories-page"
import { CustomersPage } from "./pages/customers-page"
import { InventoryPage } from "./pages/inventory-page"
import { PaymentsPage } from "./pages/payments-page"
import { PromotionsPage } from "./pages/promotions-page"
import { ContentPage } from "./pages/content-page"
import { UsersPage } from "./pages/users-page"
import { ReportsPage } from "./pages/reports-page"
import { SettingsPage } from "./pages/settings-page"
import { CustomizerPage } from "./customizer/customizer-page"
import { BusinessHoursPage } from "./pages/business-hours-page"
import { BacklogPage } from "./pages/backlog-page"
import { ReviewsPage } from "./pages/reviews-page"
import { SuperAdminPage } from "./pages/super-admin-page"
import { AuditLogsPage } from "./pages/audit-logs-page"
import { RolePermissionsPage } from "./pages/role-permissions-page"
import { SecurityDashboardPage } from "./pages/security-dashboard-page"
import { FlashSalesPage } from "./pages/flash-sales-page"
import { PerformancePage } from "./pages/performance-page"
import { ChatPage } from "./pages/chat-page"
import { HelpCenterPage } from "./pages/help-center-page"
import { ShippingZonesPage } from "./pages/shipping-zones-page"
import { OrderTrackingPage } from "./pages/order-tracking-page"
import { useOrders, useLowStockItems, useAdminReviews } from "@/lib/api-hooks"

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

export function AdminDashboard() {
  const [activeNav, setActiveNav] = useState<NavItem>("dashboard")

  // Fetch counts for sidebar badges
  const { data: ordersData } = useOrders({ status: "NEW" })
  const { data: lowStockData } = useLowStockItems()
  const { data: reviewsData } = useAdminReviews({ status: "PENDING" })

  const newOrderCount = ordersData?.pagination?.total || 0
  const lowStockCount = lowStockData?.inventory?.length || 0
  const pendingReviewCount = reviewsData?.pendingCount || 0

  const renderPage = () => {
    switch (activeNav) {
      case "dashboard":
        return <DashboardPage />
      case "orders":
        return <OrdersPage />
      case "products":
        return <ProductsPage />
      case "categories":
        return <CategoriesPage />
      case "customers":
        return <CustomersPage />
      case "inventory":
        return <InventoryPage />
      case "payments":
        return <PaymentsPage />
      case "promotions":
        return <PromotionsPage />
      case "content":
        return <ContentPage />
      case "users":
        return <UsersPage />
      case "reports":
        return <ReportsPage />
      case "settings":
        return <SettingsPage />
      case "customizer":
        return <CustomizerPage />
      case "business-hours":
        return <BusinessHoursPage />
      case "backlog":
        return <BacklogPage />
      case "reviews":
        return <ReviewsPage />
      case "super-admin":
        return <SuperAdminPage />
      case "audit-logs":
        return <AuditLogsPage />
      case "role-permissions":
        return <RolePermissionsPage />
      case "security-dashboard":
        return <SecurityDashboardPage />
      case "flash-sales":
        return <FlashSalesPage />
      case "performance":
        return <PerformancePage />
      case "chat":
        return <ChatPage />
      case "help-center":
        return <HelpCenterPage />
      case "shipping-zones":
        return <ShippingZonesPage />
      case "order-tracking":
        return <OrderTrackingPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        orderCount={newOrderCount}
        lowStockCount={lowStockCount}
        reviewCount={pendingReviewCount}
      />
      <main className="flex-1 overflow-auto">{renderPage()}</main>
    </div>
  )
}
