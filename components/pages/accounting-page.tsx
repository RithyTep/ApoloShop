"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { translations } from "@/lib/i18n"
import { useOrders, useSalesReport } from "@/lib/api-hooks"
import {
  FileSpreadsheet,
  FileText,
  Download,
  DollarSign,
  TrendingUp,
  Receipt,
  Calculator,
  Calendar,
  Building2,
  ExternalLink,
  Loader2,
  FileDown,
  Eye,
} from "lucide-react"

interface AccountingPageProps {
  language?: "EN" | "KH"
}

export function AccountingPage({ language = "EN" }: AccountingPageProps) {
  const t = translations[language === "EN" ? "en" : "kh"].accounting
  const { toast } = useToast()

  // Date range state
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split("T")[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0])
  const [period, setPeriod] = useState<"daily" | "monthly">("monthly")
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [invoiceOrder, setInvoiceOrder] = useState<string | null>(null)

  // Calculate date range for hooks
  const { startDate, endDate } = useMemo(
    () => ({
      startDate: dateFrom,
      endDate: dateTo,
    }),
    [dateFrom, dateTo]
  )

  // Fetch data
  const { data: salesData, isLoading: salesLoading } = useSalesReport({ startDate, endDate })
  const { data: ordersData, isLoading: ordersLoading } = useOrders()

  // Filter completed orders for invoices
  const completedOrders = useMemo(() => {
    if (!ordersData) return []
    return ordersData.filter(
      (order) =>
        order.status === "COMPLETED" || order.status === "READY"
    )
  }, [ordersData])

  // Export handlers
  const handleExport = async (format: string) => {
    setIsExporting(format)
    try {
      const params = new URLSearchParams({
        format,
        dateFrom,
        dateTo,
        period,
      })

      const response = await fetch(`/api/accounting/export?${params}`)

      if (!response.ok) {
        throw new Error("Export failed")
      }

      // Handle different response types
      const contentType = response.headers.get("content-type")
      const disposition = response.headers.get("content-disposition")
      const filenameMatch = disposition?.match(/filename="([^"]+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `export-${format}-${Date.now()}`

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: t.exportSuccess,
        description: `${format.toUpperCase()} ${t.downloadReport}`,
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: t.exportError,
        variant: "destructive",
      })
    } finally {
      setIsExporting(null)
    }
  }

  const handleViewInvoice = async (orderId: string) => {
    setInvoiceOrder(orderId)
    // Open invoice in new tab
    window.open(`/api/accounting/export?format=invoice&orderId=${orderId}`, "_blank")
  }

  // Quick stats
  const todaySales = useMemo(() => {
    if (!salesData?.chartData) return 0
    const today = new Date().toISOString().split("T")[0]
    const todayData = salesData.chartData.find((d) => d.date === today)
    return todayData?.revenue || 0
  }, [salesData])

  const monthSales = useMemo(() => {
    return salesData?.summary?.totalRevenue || 0
  }, [salesData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          {t.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.todaySales}</p>
              <p className="text-xl font-bold">${todaySales.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.thisMonth}</p>
              <p className="text-xl font-bold">${monthSales.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900">
              <Receipt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.orders}</p>
              <p className="text-xl font-bold">{salesData?.summary?.orderCount || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900">
              <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.vatAmount}</p>
              <p className="text-xl font-bold">${(monthSales * 0.1).toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Date Range Selector */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[150px]">
            <Label htmlFor="dateFrom">{t.from}</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Label htmlFor="dateTo">{t.to}</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Label>{t.period}</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as "daily" | "monthly")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t.daily}</SelectItem>
                <SelectItem value="monthly">{t.monthly}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="exports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="exports" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {t.exportData}
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t.invoices}
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            {t.taxReport}
          </TabsTrigger>
        </TabsList>

        {/* Export Options Tab */}
        <TabsContent value="exports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* QuickBooks Export */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg dark:bg-green-900">
                  <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t.quickbooks}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.quickbooksDesc}</p>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={() => handleExport("quickbooks")}
                    disabled={isExporting === "quickbooks"}
                  >
                    {isExporting === "quickbooks" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.generating}
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 mr-2" />
                        {t.downloadReport}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Excel Export */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg dark:bg-blue-900">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t.excel}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.excelDesc}</p>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={() => handleExport("excel")}
                    disabled={isExporting === "excel"}
                  >
                    {isExporting === "excel" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.generating}
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 mr-2" />
                        {t.downloadReport}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* CSV Export */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-100 rounded-lg dark:bg-gray-800">
                  <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t.csv}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.csvDesc}</p>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={() => handleExport("csv")}
                    disabled={isExporting === "csv"}
                  >
                    {isExporting === "csv" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.generating}
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 mr-2" />
                        {t.downloadReport}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Tax Report Export */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-lg dark:bg-red-900">
                  <Calculator className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t.taxReport}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.taxReportDesc}</p>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={() => handleExport("tax")}
                    disabled={isExporting === "tax"}
                  >
                    {isExporting === "tax" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.generating}
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 mr-2" />
                        {t.downloadReport}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Revenue Summary */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-lg dark:bg-purple-900">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t.revenueSummary}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.revenueSummaryDesc}</p>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={() => handleExport("summary")}
                    disabled={isExporting === "summary"}
                  >
                    {isExporting === "summary" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.generating}
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 mr-2" />
                        {t.downloadReport}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card className="p-0">
            {ordersLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.invoiceNumber}</TableHead>
                    <TableHead>{t.orderReference}</TableHead>
                    <TableHead>{t.issueDate}</TableHead>
                    <TableHead className="text-right">{t.total}</TableHead>
                    <TableHead>{t.paymentStatus}</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No completed orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    completedOrders.slice(0, 20).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">INV-{order.orderNumber}</TableCell>
                        <TableCell>{order.orderNumber}</TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(order.totalUsd).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.payments?.[0]?.status === "COMPLETED"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {order.payments?.[0]?.status || "PENDING"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewInvoice(order.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t.viewInvoice}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Tax Report Tab */}
        <TabsContent value="tax" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t.taxReport}</h3>

            {salesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">{t.totalSales}</p>
                    <p className="text-xl font-bold">
                      ${salesData?.summary?.totalRevenue?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">{t.taxableSales}</p>
                    <p className="text-xl font-bold">
                      ${((salesData?.summary?.totalRevenue || 0) / 1.1).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">{t.vatAmount}</p>
                    <p className="text-xl font-bold text-red-600">
                      ${((salesData?.summary?.totalRevenue || 0) * 0.1 / 1.1).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">{t.orders}</p>
                    <p className="text-xl font-bold">
                      {salesData?.summary?.orderCount || 0}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">{t.byCategory}</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Sales (USD)</TableHead>
                        <TableHead className="text-right">VAT (10%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData?.salesByCategory?.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell>{cat.nameEn}</TableCell>
                          <TableCell className="text-right">${cat.revenue.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            ${(cat.revenue * 0.1 / 1.1).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end mt-4">
                  <Button onClick={() => handleExport("tax")} disabled={isExporting === "tax"}>
                    {isExporting === "tax" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.generating}
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        {t.downloadReport}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
