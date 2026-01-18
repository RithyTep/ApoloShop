"use client"

import { DashboardWidgets } from "@/components/dashboard-widgets"
import { PopularSearchesWidget } from "@/components/popular-searches-widget"
import { AdminPageHeader } from "@/components/admin"

export function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <AdminPageHeader
        title="Dashboard"
        subtitle="Overview of your shop's performance"
      />

      {/* Main Dashboard Widgets */}
      <DashboardWidgets />

      {/* Additional Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Popular Searches Widget */}
        <div className="lg:col-span-1">
          <PopularSearchesWidget limit={10} />
        </div>
      </div>
    </div>
  )
}
