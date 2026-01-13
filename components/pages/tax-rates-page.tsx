"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash, Receipt, Globe, Calendar, Download, TrendingUp } from "lucide-react"
import {
  useTaxRates,
  useCreateTaxRate,
  useUpdateTaxRate,
  useDeleteTaxRate,
  useTaxReport,
  TaxRate,
  TaxType,
  TaxPricingMode,
  useCategories,
} from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"

const taxTypes: { value: TaxType; label: string }[] = [
  { value: "VAT", label: "VAT (Value Added Tax)" },
  { value: "SALES_TAX", label: "Sales Tax" },
  { value: "GST", label: "GST (Goods & Services Tax)" },
  { value: "CUSTOM", label: "Custom Tax" },
]

const pricingModes: { value: TaxPricingMode; label: string; description: string }[] = [
  { value: "EXCLUSIVE", label: "Tax Exclusive", description: "Tax added on top of price" },
  { value: "INCLUSIVE", label: "Tax Inclusive", description: "Tax included in displayed price" },
]

// Common countries for Southeast Asia
const commonCountries = [
  { code: "KH", name: "Cambodia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "SG", name: "Singapore" },
  { code: "MY", name: "Malaysia" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
  { code: "LA", name: "Laos" },
  { code: "MM", name: "Myanmar" },
  { code: "US", name: "United States" },
]

interface FormData {
  country: string
  countryName: string
  region: string
  regionName: string
  name: string
  rate: string
  taxType: TaxType
  categoryId: string
  pricingMode: TaxPricingMode
  isDefault: boolean
  isActive: boolean
  description: string
  effectiveFrom: string
  effectiveTo: string
}

const emptyFormData: FormData = {
  country: "KH",
  countryName: "Cambodia",
  region: "",
  regionName: "",
  name: "",
  rate: "10",
  taxType: "VAT",
  categoryId: "",
  pricingMode: "EXCLUSIVE",
  isDefault: false,
  isActive: true,
  description: "",
  effectiveFrom: "",
  effectiveTo: "",
}

export function TaxRatesPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"rates" | "report">("rates")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null)
  const [deleteRate, setDeleteRate] = useState<TaxRate | null>(null)

  // Date range for report
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const [reportStartDate, setReportStartDate] = useState(thirtyDaysAgo.toISOString().split("T")[0])
  const [reportEndDate, setReportEndDate] = useState(now.toISOString().split("T")[0])

  const { data: taxRatesData, isLoading: isLoadingRates } = useTaxRates()
  const { data: taxReport, isLoading: isLoadingReport } = useTaxReport(reportStartDate, reportEndDate)
  const { data: categoriesData } = useCategories()
  const createMutation = useCreateTaxRate()
  const updateMutation = useUpdateTaxRate()
  const deleteMutation = useDeleteTaxRate()

  const taxRates = taxRatesData || []
  const categories = categoriesData?.categories || []

  const [formData, setFormData] = useState<FormData>(emptyFormData)

  const resetForm = () => {
    setFormData(emptyFormData)
    setEditingRate(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (rate: TaxRate) => {
    setEditingRate(rate)
    setFormData({
      country: rate.country,
      countryName: rate.countryName,
      region: rate.region || "",
      regionName: rate.regionName || "",
      name: rate.name,
      rate: rate.ratePercent.toString(),
      taxType: rate.taxType,
      categoryId: rate.categoryId || "",
      pricingMode: rate.pricingMode,
      isDefault: rate.isDefault,
      isActive: rate.isActive,
      description: rate.description || "",
      effectiveFrom: rate.effectiveFrom ? rate.effectiveFrom.split("T")[0] : "",
      effectiveTo: rate.effectiveTo ? rate.effectiveTo.split("T")[0] : "",
    })
    setIsDialogOpen(true)
  }

  const handleCountryChange = (countryCode: string) => {
    const country = commonCountries.find(c => c.code === countryCode)
    setFormData({
      ...formData,
      country: countryCode,
      countryName: country?.name || countryCode,
    })
  }

  const handleSubmit = async () => {
    try {
      if (!formData.name) {
        toast({ title: "Error", description: "Tax name is required", variant: "destructive" })
        return
      }

      const ratePercent = parseFloat(formData.rate)
      if (isNaN(ratePercent) || ratePercent < 0 || ratePercent > 100) {
        toast({ title: "Error", description: "Rate must be between 0 and 100%", variant: "destructive" })
        return
      }

      const payload = {
        country: formData.country,
        countryName: formData.countryName,
        region: formData.region || null,
        regionName: formData.regionName || null,
        name: formData.name,
        rate: ratePercent / 100, // Convert percentage to decimal
        taxType: formData.taxType,
        categoryId: formData.categoryId || null,
        pricingMode: formData.pricingMode,
        isDefault: formData.isDefault,
        isActive: formData.isActive,
        description: formData.description || null,
        effectiveFrom: formData.effectiveFrom || null,
        effectiveTo: formData.effectiveTo || null,
      }

      if (editingRate) {
        await updateMutation.mutateAsync({ id: editingRate.id, ...payload })
        toast({ title: "Tax rate updated successfully" })
      } else {
        await createMutation.mutateAsync(payload)
        toast({ title: "Tax rate created successfully" })
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save tax rate",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteRate) return

    try {
      await deleteMutation.mutateAsync(deleteRate.id)
      toast({ title: "Tax rate deleted successfully" })
      setDeleteRate(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tax rate",
        variant: "destructive",
      })
    }
  }

  const exportTaxReport = () => {
    const params = new URLSearchParams({
      startDate: reportStartDate,
      endDate: reportEndDate,
      format: "csv",
    })
    window.open(`/api/reports/tax?${params.toString()}`, "_blank")
  }

  const formatCurrency = (amount: number, currency: "USD" | "KHR" = "USD") => {
    if (currency === "KHR") {
      return `${amount.toLocaleString()} ៛`
    }
    return `$${amount.toFixed(2)}`
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground">Configure tax rates by location and product category</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="rates">Tax Rates</TabsTrigger>
          <TabsTrigger value="report">Tax Report</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-4">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Tax Rates
              </h2>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tax Rate
              </Button>
            </div>

            {isLoadingRates ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : taxRates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tax rates configured yet</p>
                <p className="text-sm">Add a tax rate to start calculating taxes on orders</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>
                        <div className="font-medium">{rate.name}</div>
                        {rate.categoryId && (
                          <div className="text-xs text-muted-foreground">
                            Category: {categories.find(c => c.id === rate.categoryId)?.nameEn || rate.categoryId}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {rate.countryName}
                          {rate.region && <span className="text-muted-foreground">/ {rate.regionName || rate.region}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{rate.ratePercent}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rate.taxType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rate.pricingMode === "INCLUSIVE" ? "secondary" : "default"}>
                          {rate.pricingMode === "INCLUSIVE" ? "Inclusive" : "Exclusive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={rate.isActive ? "default" : "secondary"}>
                            {rate.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {rate.isDefault && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(rate)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteRate(rate)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          {/* Date Range Selector */}
          <Card className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label>Date Range:</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-auto"
                />
                <span>to</span>
                <Input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <Button variant="outline" onClick={exportTaxReport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Receipt className="h-4 w-4" />
                Total Orders
              </div>
              {isLoadingReport ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{taxReport?.summary?.totalOrders || 0}</div>
              )}
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                Total Subtotal
              </div>
              {isLoadingReport ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div>
                  <div className="text-2xl font-bold">{formatCurrency(taxReport?.summary?.totalSubtotalUsd || 0)}</div>
                  <div className="text-sm text-muted-foreground">{formatCurrency(taxReport?.summary?.totalSubtotalKhr || 0, "KHR")}</div>
                </div>
              )}
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Receipt className="h-4 w-4" />
                Total Tax Collected
              </div>
              {isLoadingReport ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(taxReport?.summary?.totalTaxUsd || 0)}</div>
                  <div className="text-sm text-muted-foreground">{formatCurrency(taxReport?.summary?.totalTaxKhr || 0, "KHR")}</div>
                </div>
              )}
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Receipt className="h-4 w-4" />
                Effective Tax Rate
              </div>
              {isLoadingReport ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{taxReport?.summary?.effectiveTaxRate?.toFixed(2) || 0}%</div>
              )}
            </Card>
          </div>

          {/* Tax by Country */}
          {taxReport?.byCountry && taxReport.byCountry.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Tax by Country
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Subtotal (USD)</TableHead>
                    <TableHead className="text-right">Tax Collected (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxReport.byCountry.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.country}</TableCell>
                      <TableCell className="text-right">{item.orderCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalSubtotalUsd)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(item.totalTaxUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Tax by Type */}
          {taxReport?.byTaxType && taxReport.byTaxType.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Tax by Type
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Tax Collected (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxReport.byTaxType.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.taxName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.taxType}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.orderCount}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(item.totalTaxUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* No data state */}
          {!isLoadingReport && (!taxReport?.logs || taxReport.logs.length === 0) && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tax data for the selected period</p>
                <p className="text-sm">Tax logs will appear here once orders with tax calculations are processed</p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRate ? "Edit Tax Rate" : "Add Tax Rate"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tax Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Tax Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Cambodia VAT"
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label>Country *</Label>
              <Select value={formData.country} onValueChange={handleCountryChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {commonCountries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Region (Optional) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="region">Region Code</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="e.g., PP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regionName">Region Name</Label>
                <Input
                  id="regionName"
                  value={formData.regionName}
                  onChange={(e) => setFormData({ ...formData, regionName: e.target.value })}
                  placeholder="e.g., Phnom Penh"
                />
              </div>
            </div>

            {/* Tax Rate */}
            <div className="space-y-2">
              <Label htmlFor="rate">Tax Rate (%) *</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">Enter as percentage (e.g., 10 for 10%)</p>
            </div>

            {/* Tax Type */}
            <div className="space-y-2">
              <Label>Tax Type</Label>
              <Select value={formData.taxType} onValueChange={(v) => setFormData({ ...formData, taxType: v as TaxType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taxTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pricing Mode */}
            <div className="space-y-2">
              <Label>Pricing Mode</Label>
              <Select value={formData.pricingMode} onValueChange={(v) => setFormData({ ...formData, pricingMode: v as TaxPricingMode })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pricingModes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      <div>
                        <div>{mode.label}</div>
                        <div className="text-xs text-muted-foreground">{mode.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category (Optional) */}
            <div className="space-y-2">
              <Label>Apply to Category (Optional)</Label>
              <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v === "all" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Leave empty to apply to all products</p>
            </div>

            {/* Effective Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effectiveFrom">Effective From</Label>
                <Input
                  id="effectiveFrom"
                  type="date"
                  value={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveTo">Effective To</Label>
                <Input
                  id="effectiveTo"
                  type="date"
                  value={formData.effectiveTo}
                  onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional notes about this tax rate"
                rows={2}
              />
            </div>

            {/* Switches */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={(v) => setFormData({ ...formData, isDefault: v })}
                />
                <Label>Set as default for country</Label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRate} onOpenChange={() => setDeleteRate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tax Rate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteRate?.name}&quot;? This action cannot be undone.
              Existing tax logs will be preserved but will no longer reference this rate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
