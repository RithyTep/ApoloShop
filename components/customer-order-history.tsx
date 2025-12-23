"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { translations, type Language } from "@/lib/i18n"

interface Customer {
  id: string
  name: string
  phone: string
  orderCount: number
  totalSpent: number
  lastOrderDate: string
  tags: ("vip" | "frequentBuyer")[]
  notes: string
}

interface CustomerOrderHistoryProps {
  language?: Language
}

export function CustomerOrderHistory({ language = "en" }: CustomerOrderHistoryProps) {
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: "1",
      name: "សុផល អ៉ោម",
      phone: "+855 12 345 678",
      orderCount: 24,
      totalSpent: 145.5,
      lastOrderDate: "2024-12-23",
      tags: ["vip", "frequentBuyer"],
      notes: "Prefers iced coffee, delivery to office",
    },
    {
      id: "2",
      name: "Sophat Kim",
      phone: "+855 98 765 432",
      orderCount: 12,
      totalSpent: 78.2,
      lastOrderDate: "2024-12-21",
      tags: ["frequentBuyer"],
      notes: "No sugar in drinks",
    },
  ])

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [note, setNote] = useState("")

  const t = translations[language]

  const handleAddNote = (customerId: string) => {
    if (note.trim()) {
      setCustomers(customers.map((c) => (c.id === customerId ? { ...c, notes: c.notes + "\n" + note } : c)))
      setNote("")
    }
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.customerHistory.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">{t.customerHistory.phone}</th>
                  <th className="text-right p-2 font-semibold">{t.customerHistory.orderCount}</th>
                  <th className="text-right p-2 font-semibold">{t.customerHistory.totalSpent}</th>
                  <th className="text-left p-2 font-semibold">{t.customerHistory.lastOrder}</th>
                  <th className="text-left p-2 font-semibold">{t.customerHistory.tags}</th>
                  <th className="text-center p-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-pink-50">
                    <td className="p-2">
                      <div>
                        <p className="font-semibold">{customer.name}</p>
                        <p className="text-gray-600">{customer.phone}</p>
                      </div>
                    </td>
                    <td className="text-right p-2">{customer.orderCount}</td>
                    <td className="text-right p-2">${customer.totalSpent.toFixed(2)}</td>
                    <td className="p-2 text-gray-600">{customer.lastOrderDate}</td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        {customer.tags.map((tag) => (
                          <Badge
                            key={tag}
                            className={tag === "vip" ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"}
                          >
                            {tag === "vip" ? t.customerHistory.vip : t.customerHistory.frequentBuyer}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedCustomer(customer)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Detail View */}
      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedCustomer.name} - {selectedCustomer.phone}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">{t.customerHistory.orderCount}</p>
                <p className="text-2xl font-bold text-pink-600">{selectedCustomer.orderCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t.customerHistory.totalSpent}</p>
                <p className="text-2xl font-bold text-pink-600">${selectedCustomer.totalSpent.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm font-semibold mb-2">{t.customerHistory.notes}</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedCustomer.notes}</p>
            </div>

            <div>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.customerHistory.addNote}
              />
              <Button
                onClick={() => handleAddNote(selectedCustomer.id)}
                className="mt-2 w-full bg-pink-500 hover:bg-pink-600 text-white"
              >
                {t.customerHistory.addNote}
              </Button>
            </div>

            <Button variant="outline" onClick={() => setSelectedCustomer(null)} className="w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
