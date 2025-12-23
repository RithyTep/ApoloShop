# Export API

## GET /api/export

Export data in Excel or PDF format.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `type` | string | orders, products, customers, payments |
| `format` | string | excel, pdf |
| `dateFrom` | string | Start date (YYYY-MM-DD) |
| `dateTo` | string | End date (YYYY-MM-DD) |
| `status` | string | Filter by status (for orders/payments) |

**Response:**
Returns file download with appropriate Content-Type:
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- PDF: `application/pdf`

---

## Export Types

### Orders Export
```
GET /api/export?type=orders&format=excel&dateFrom=2024-12-01&dateTo=2024-12-31
```

Includes: Order number, date, customer, items, total, status, channel

### Products Export
```
GET /api/export?type=products&format=excel
```

Includes: SKU, name (EN/KH), price (USD/KHR), category, stock, status

### Customers Export
```
GET /api/export?type=customers&format=excel
```

Includes: Name, phone, email, order count, total spent, tags

### Payments Export
```
GET /api/export?type=payments&format=pdf&dateFrom=2024-12-01
```

Includes: Date, order, method, amount, currency, status

---

## Daily Report

```
GET /api/export?type=daily-report&date=2024-12-23
```

**PDF Report includes:**
- Total orders by status
- Total revenue (USD/KHR)
- Payment breakdown by method
- Top selling products
- Hourly order distribution

---

# Export Utilities

```tsx
import {
  exportToExcel,
  exportToPDF,
  generateDailyReport
} from '@/lib/export'

// Export orders to Excel
const buffer = await exportToExcel('orders', orders)

// Export to PDF
const pdf = await exportToPDF('products', products)

// Generate daily report
const report = await generateDailyReport('2024-12-23')
```

---

# React Usage

```tsx
import { useExport } from '@/lib/api-hooks'

function ExportButton() {
  const exportData = useExport()

  const handleExport = async () => {
    const blob = await exportData.mutateAsync({
      type: 'orders',
      format: 'excel',
      dateFrom: '2024-12-01',
      dateTo: '2024-12-31'
    })

    // Download file
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'orders.xlsx'
    a.click()
  }

  return <Button onClick={handleExport}>Export</Button>
}
```
