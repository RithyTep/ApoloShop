"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Ruler, Info, Check } from "lucide-react"
import { translations } from "@/lib/i18n"

interface SizeDefinition {
  size: string
  measurements: Record<string, number>
}

interface SizeChartData {
  id: string
  nameEn: string
  nameKh: string
  brandEn?: string
  brandKh?: string
  chartType: "CLOTHING" | "SHOES" | "ACCESSORIES" | "JEWELRY" | "KIDS"
  unit: "CM" | "INCH"
  sizes: SizeDefinition[]
  measurementTypes: string[]
  measurementGuideImage?: string
  fitType: "SLIM" | "REGULAR" | "RELAXED" | "OVERSIZED"
}

interface SizeGuideProps {
  productId?: string
  categoryId?: string
  sizeChart?: SizeChartData | null
  language: "EN" | "KH"
  selectedSize?: string
  onSizeSelect?: (size: string) => void
}

// Measurement label translations
const measurementLabels: Record<string, Record<string, string>> = {
  en: {
    chest: "Chest",
    waist: "Waist",
    hips: "Hips",
    length: "Length",
    shoulder: "Shoulder",
    sleeve: "Sleeve",
    inseam: "Inseam",
    neck: "Neck",
    footLength: "Foot Length",
    footWidth: "Foot Width",
  },
  kh: {
    chest: "ទ្រូង",
    waist: "ចង្កេះ",
    hips: "សាច់ដុំ",
    length: "ប្រវែង",
    shoulder: "ស្មា",
    sleeve: "ដៃអាវ",
    inseam: "ជើង​ខាងក្នុង",
    neck: "ក",
    footLength: "ប្រវែងជើង",
    footWidth: "ទទឹងជើង",
  },
}

// Fit type labels
const fitTypeLabels: Record<string, Record<string, string>> = {
  en: {
    SLIM: "Slim Fit",
    REGULAR: "Regular Fit",
    RELAXED: "Relaxed Fit",
    OVERSIZED: "Oversized",
  },
  kh: {
    SLIM: "សម្បុរតឹង",
    REGULAR: "សម្បុរធម្មតា",
    RELAXED: "សម្បុរធូរធារ",
    OVERSIZED: "ធំជាង",
  },
}

export function SizeGuide({
  sizeChart,
  language,
  selectedSize,
  onSizeSelect,
}: SizeGuideProps) {
  const [unit, setUnit] = useState<"CM" | "INCH">(sizeChart?.unit || "CM")
  const t = translations[language === "EN" ? "en" : "kh"]
  const lang = language === "EN" ? "en" : "kh"

  if (!sizeChart) {
    return null
  }

  const chartName = language === "EN" ? sizeChart.nameEn : sizeChart.nameKh
  const brandName = language === "EN" ? sizeChart.brandEn : sizeChart.brandKh

  // Convert cm to inches if needed
  const convertMeasurement = (value: number) => {
    if (unit === "INCH" && sizeChart.unit === "CM") {
      return (value / 2.54).toFixed(1)
    }
    if (unit === "CM" && sizeChart.unit === "INCH") {
      return (value * 2.54).toFixed(1)
    }
    return value
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ruler className="h-5 w-5" />
            {chartName}
            {brandName && (
              <Badge variant="secondary" className="ml-2">
                {brandName}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {fitTypeLabels[lang][sizeChart.fitType]}
            </Badge>
            <div className="flex border rounded-md overflow-hidden">
              <button
                className={`px-2 py-1 text-xs ${unit === "CM" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                onClick={() => setUnit("CM")}
              >
                cm
              </button>
              <button
                className={`px-2 py-1 text-xs ${unit === "INCH" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                onClick={() => setUnit("INCH")}
              >
                in
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">
                  {language === "EN" ? "Size" : "ទំហំ"}
                </TableHead>
                {sizeChart.measurementTypes.map((type) => (
                  <TableHead key={type} className="text-center">
                    {measurementLabels[lang][type] || type}
                  </TableHead>
                ))}
                {onSizeSelect && (
                  <TableHead className="w-20 text-center">
                    {language === "EN" ? "Select" : "ជ្រើសរើស"}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizeChart.sizes.map((sizeItem) => (
                <TableRow
                  key={sizeItem.size}
                  className={
                    selectedSize === sizeItem.size
                      ? "bg-primary/10 border-primary"
                      : ""
                  }
                >
                  <TableCell className="font-medium">
                    {sizeItem.size}
                    {selectedSize === sizeItem.size && (
                      <Check className="h-4 w-4 inline-block ml-1 text-primary" />
                    )}
                  </TableCell>
                  {sizeChart.measurementTypes.map((type) => (
                    <TableCell key={type} className="text-center">
                      {sizeItem.measurements[type]
                        ? convertMeasurement(sizeItem.measurements[type])
                        : "-"}
                    </TableCell>
                  ))}
                  {onSizeSelect && (
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant={selectedSize === sizeItem.size ? "default" : "outline"}
                        onClick={() => onSizeSelect(sizeItem.size)}
                      >
                        {selectedSize === sizeItem.size
                          ? language === "EN"
                            ? "Selected"
                            : "បានជ្រើសរើស"
                          : language === "EN"
                            ? "Select"
                            : "ជ្រើសរើស"}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Measurement Guide */}
        {sizeChart.measurementGuideImage && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              {language === "EN" ? "How to Measure" : "របៀបវាស់"}
            </h4>
            <img
              src={sizeChart.measurementGuideImage}
              alt={language === "EN" ? "Measurement guide" : "មគ្គុទ្ទេសក៍វាស់"}
              className="max-w-full h-auto rounded"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Size Guide Dialog (can be used as a modal)
export function SizeGuideDialog({
  productId,
  categoryId,
  sizeChart,
  language,
  selectedSize,
  onSizeSelect,
  trigger,
}: SizeGuideProps & {
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Ruler className="h-4 w-4" />
            {language === "EN" ? "Size Guide" : "មគ្គុទ្ទេសក៍ទំហំ"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            {language === "EN" ? "Size Guide" : "មគ្គុទ្ទេសក៍ទំហំ"}
          </DialogTitle>
        </DialogHeader>
        <SizeGuide
          productId={productId}
          categoryId={categoryId}
          sizeChart={sizeChart}
          language={language}
          selectedSize={selectedSize}
          onSizeSelect={(size) => {
            onSizeSelect?.(size)
            setOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

// Size Guide Skeleton for loading state
export function SizeGuideSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

// Brand Comparison Component
interface BrandComparisonProps {
  sizeCharts: SizeChartData[]
  language: "EN" | "KH"
  size: string
}

export function BrandComparison({ sizeCharts, language, size }: BrandComparisonProps) {
  const lang = language === "EN" ? "en" : "kh"

  if (sizeCharts.length < 2) return null

  // Find the size in each chart
  const comparisons = sizeCharts.map((chart) => {
    const sizeData = chart.sizes.find((s) => s.size === size)
    return {
      brand: language === "EN" ? chart.brandEn : chart.brandKh,
      chartName: language === "EN" ? chart.nameEn : chart.nameKh,
      measurements: sizeData?.measurements || {},
    }
  })

  // Get all unique measurement types
  const allTypes = new Set<string>()
  sizeCharts.forEach((chart) => {
    chart.measurementTypes.forEach((type) => allTypes.add(type))
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {language === "EN" ? `Size ${size} Comparison` : `ប្រៀបធៀបទំហំ ${size}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {language === "EN" ? "Brand/Chart" : "ម៉ាក/តារាង"}
              </TableHead>
              {Array.from(allTypes).map((type) => (
                <TableHead key={type} className="text-center">
                  {measurementLabels[lang][type] || type}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisons.map((comp, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">
                  {comp.brand || comp.chartName}
                </TableCell>
                {Array.from(allTypes).map((type) => (
                  <TableCell key={type} className="text-center">
                    {comp.measurements[type] || "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
