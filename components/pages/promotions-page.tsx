"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

const promotions = [
  { id: 1, code: "WELCOME10", type: "Percentage", value: "10%", startDate: "Dec 1", endDate: "Dec 31", enabled: true },
  { id: 2, code: "XMAS50", type: "Fixed", value: "$5.00", startDate: "Dec 20", endDate: "Dec 25", enabled: true },
]

export function PromotionsPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Promotions</h1>
          <p className="text-muted-foreground mt-2">Manage discount codes and promotions</p>
        </div>
        <Button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} /> Add Promotion
        </Button>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="text-foreground font-semibold">Code</TableHead>
                <TableHead className="text-foreground font-semibold">Type</TableHead>
                <TableHead className="text-foreground font-semibold">Value</TableHead>
                <TableHead className="text-foreground font-semibold">Start Date</TableHead>
                <TableHead className="text-foreground font-semibold">End Date</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promo) => (
                <TableRow key={promo.id} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="text-foreground font-medium">{promo.code}</TableCell>
                  <TableCell className="text-foreground">{promo.type}</TableCell>
                  <TableCell className="text-foreground">{promo.value}</TableCell>
                  <TableCell className="text-foreground">{promo.startDate}</TableCell>
                  <TableCell className="text-foreground">{promo.endDate}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="rounded-sm">
                      {promo.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
