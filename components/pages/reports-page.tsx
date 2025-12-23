"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Download } from "lucide-react"

const salesData = [
  { month: "Jan", sales: 4000, orders: 24 },
  { month: "Feb", sales: 3000, orders: 18 },
  { month: "Mar", sales: 5000, orders: 32 },
  { month: "Apr", sales: 4500, orders: 28 },
]

export function ReportsPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-2">Analyze sales, products, and business metrics</p>
        </div>
        <Button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Download size={16} /> Export Report
        </Button>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Sales Overview</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip />
            <Bar dataKey="sales" fill="var(--color-primary)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
