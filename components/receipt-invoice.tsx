"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Printer } from "phosphor-react"
import { translations, type Language } from "@/lib/i18n"

interface ReceiptItem {
  name: string
  quantity: number
  price: number
}

interface ReceiptInvoiceProps {
  language?: Language
  orderId?: string
  customerName?: string
  customerPhone?: string
  items?: ReceiptItem[]
  subtotal?: number
  discount?: number
  total?: number
  paymentMethod?: string
  orderDate?: string
}

export function ReceiptInvoice({
  language = "en",
  orderId = "ORD-20241223-001",
  customerName = "សុផល អ៉ោម",
  customerPhone = "+855 12 345 678",
  items = [
    { name: "Iced Latte", quantity: 2, price: 4.5 },
    { name: "Cappuccino", quantity: 1, price: 3.5 },
    { name: "Pastry", quantity: 1, price: 2.0 },
  ],
  subtotal = 14.5,
  discount = 1.45,
  total = 13.05,
  paymentMethod = "Cash",
  orderDate = "2024-12-23 14:30",
}: ReceiptInvoiceProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const t = translations[language]

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open("", "", "width=400,height=600")
      if (printWindow) {
        printWindow.document.write(receiptRef.current.innerHTML)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Receipt Paper */}
      <div
        ref={receiptRef}
        id="receipt-print"
        className="bg-white p-8 border-4 border-gray-900 text-center font-mono text-sm"
        style={{ width: "374px" }}
      >
        {/* Header */}
        <div className="mb-4">
          <p className="text-lg font-bold">☕ SHOP CMS</p>
          <p className="text-xs">Cambodian Coffee Café</p>
          <p className="text-xs text-gray-600">Phnom Penh, Cambodia</p>
        </div>

        <Separator className="my-2 border-gray-900" />

        {/* Order Info */}
        <div className="text-left text-xs space-y-1 mb-4">
          <p>
            <span className="inline-block w-24">{t.receipt.orderId}:</span>
            <span className="font-bold">{orderId}</span>
          </p>
          <p>
            <span className="inline-block w-24">{t.receipt.orderDate}:</span>
            <span>{orderDate}</span>
          </p>
        </div>

        <Separator className="my-2 border-gray-900" />

        {/* Customer Info */}
        <div className="text-left text-xs space-y-1 mb-4">
          <p>
            <span className="inline-block w-24">{t.receipt.customerName}:</span>
            <span>{customerName}</span>
          </p>
          <p>
            <span className="inline-block w-24">{t.receipt.phone}:</span>
            <span>{customerPhone}</span>
          </p>
        </div>

        <Separator className="my-2 border-gray-900" />

        {/* Items Table */}
        <div className="text-left text-xs mb-4">
          <div className="flex justify-between font-bold mb-2">
            <span>{t.receipt.items}</span>
            <span>{t.receipt.price}</span>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between">
                <span>{item.name}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
              <div className="text-gray-600 text-xs">
                {item.quantity}x ${item.price.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-2 border-gray-900" />

        {/* Totals */}
        <div className="text-left text-xs space-y-1 mb-4">
          <div className="flex justify-between">
            <span>{t.receipt.subtotal}:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t.receipt.discount}:</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2">
            <span>{t.receipt.total}:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <Separator className="my-2 border-gray-900" />

        {/* Payment Info */}
        <div className="text-left text-xs mb-4">
          <p>
            <span className="inline-block w-24">{t.receipt.paymentMethod}:</span>
            <span className="font-bold">{paymentMethod}</span>
          </p>
          <p>
            <span className="inline-block w-24">{t.receipt.paid}:</span>
            <span className="font-bold">${total.toFixed(2)}</span>
          </p>
        </div>

        {/* QR Code Placeholder */}
        <div className="my-4 flex justify-center">
          <div className="w-24 h-24 border-2 border-gray-900 flex items-center justify-center text-xs">QR Code</div>
        </div>

        {/* Footer */}
        <Separator className="my-2 border-gray-900" />
        <p className="text-xs font-bold">{t.receipt.thankyou}</p>
        <p className="text-xs text-gray-600 mt-2">• • •</p>
      </div>

      {/* Print Button */}
      <Button
        onClick={handlePrint}
        className="w-full bg-pink-600 hover:bg-pink-700 text-white"
        aria-label="Print receipt"
      >
        <Printer className="w-4 h-4 mr-2" aria-hidden="true" />
        {t.receipt.print}
      </Button>
    </div>
  )
}
