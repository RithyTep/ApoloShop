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

export function AdminDashboard() {
  const [activeNav, setActiveNav] = useState<NavItem>("dashboard")

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
      default:
        return <DashboardPage />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
      <main className="flex-1 overflow-auto">{renderPage()}</main>
    </div>
  )
}
