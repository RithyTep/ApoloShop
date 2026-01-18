"use client"

import { useRef, forwardRef, useImperativeHandle } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Printer, Download } from "lucide-react"
import { useState } from "react"
import { generateEAN13FromSKU, BarcodeLabelData } from "@/lib/sku-barcode-utils"

// Barcode rendering using CODE128 pattern (simplified)
function renderBarcode(value: string, width: number, height: number): string {
  // Generate simple bar pattern from value
  let pattern = '101' // Start
  for (const char of value) {
    const code = char.charCodeAt(0)
    pattern += code.toString(2).padStart(8, '0')
  }
  pattern += '101' // End

  const barWidth = width / pattern.length
  let svg = ''

  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      svg += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${height}" fill="black"/>`
    }
  }

  return svg
}

interface BarcodeLabelProps {
  data: BarcodeLabelData
  size?: 'small' | 'medium' | 'large'
  showPrice?: boolean
  showCategory?: boolean
}

export const BarcodeLabel = forwardRef<HTMLDivElement, BarcodeLabelProps>(
  ({ data, size = 'medium', showPrice = true, showCategory = false }, ref) => {
    const dimensions = {
      small: { width: 38, height: 25, fontSize: 6, barcodeHeight: 15 },
      medium: { width: 50, height: 30, fontSize: 8, barcodeHeight: 20 },
      large: { width: 60, height: 40, fontSize: 10, barcodeHeight: 25 },
    }

    const dim = dimensions[size]
    const barcodeWidth = dim.width - 4 // 2mm padding each side

    return (
      <div
        ref={ref}
        className="bg-white text-black inline-block print:break-inside-avoid"
        style={{
          width: `${dim.width}mm`,
          height: `${dim.height}mm`,
          padding: '2mm',
          fontFamily: 'monospace',
        }}
      >
        {/* Product Name */}
        <div
          style={{
            fontSize: `${dim.fontSize}pt`,
            fontWeight: 'bold',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: '1mm',
          }}
        >
          {data.productName}
        </div>

        {/* Category (optional) */}
        {showCategory && data.categoryName && (
          <div
            style={{
              fontSize: `${dim.fontSize - 1}pt`,
              textAlign: 'center',
              color: '#666',
              marginBottom: '1mm',
            }}
          >
            {data.categoryName}
          </div>
        )}

        {/* Barcode */}
        <div style={{ textAlign: 'center', marginBottom: '1mm' }}>
          <svg
            width={`${barcodeWidth}mm`}
            height={`${dim.barcodeHeight}mm`}
            viewBox={`0 0 ${barcodeWidth * 3} ${dim.barcodeHeight * 3}`}
            dangerouslySetInnerHTML={{
              __html: renderBarcode(data.barcode, barcodeWidth * 3, dim.barcodeHeight * 3),
            }}
          />
        </div>

        {/* Barcode Number */}
        <div
          style={{
            fontSize: `${dim.fontSize - 1}pt`,
            textAlign: 'center',
            letterSpacing: '1px',
          }}
        >
          {data.barcode}
        </div>

        {/* SKU and Price Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: `${dim.fontSize - 1}pt`,
            marginTop: '1mm',
          }}
        >
          <span>SKU: {data.sku}</span>
          {showPrice && <span style={{ fontWeight: 'bold' }}>{data.price}</span>}
        </div>
      </div>
    )
  }
)

BarcodeLabel.displayName = 'BarcodeLabel'

// Print Preview Dialog
interface PrintPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Array<{
    id: string
    sku: string
    nameEn: string
    priceUsd: number | string
    category?: { nameEn: string }
  }>
}

export function PrintPreviewDialog({ open, onOpenChange, products }: PrintPreviewDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [labelSize, setLabelSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [labelsPerProduct, setLabelsPerProduct] = useState(1)
  const [showPrice, setShowPrice] = useState(true)
  const [showCategory, setShowCategory] = useState(false)

  const handlePrint = () => {
    if (!printRef.current) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const content = printRef.current.innerHTML

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Labels</title>
          <style>
            @media print {
              body {
                margin: 0;
                padding: 5mm;
              }
              .label-container {
                display: flex;
                flex-wrap: wrap;
                gap: 2mm;
              }
            }
            body {
              font-family: monospace;
              margin: 0;
              padding: 5mm;
            }
            .label-container {
              display: flex;
              flex-wrap: wrap;
              gap: 2mm;
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            ${content}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleDownloadSVG = () => {
    if (products.length === 0) return

    const product = products[0]
    const labelData: BarcodeLabelData = {
      sku: product.sku,
      barcode: generateEAN13FromSKU(product.sku),
      barcodeFormat: 'EAN13',
      productName: product.nameEn,
      price: `$${Number(product.priceUsd).toFixed(2)}`,
      categoryName: product.category?.nameEn,
    }

    const barcodeWidth = 140
    const barcodeHeight = 60
    const barcodeSvg = renderBarcode(labelData.barcode, barcodeWidth, barcodeHeight)

    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">
        <rect width="200" height="120" fill="white"/>
        <text x="100" y="15" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold">
          ${labelData.productName}
        </text>
        <g transform="translate(30, 20)">
          ${barcodeSvg}
        </g>
        <text x="100" y="90" text-anchor="middle" font-family="monospace" font-size="8">
          ${labelData.barcode}
        </text>
        <text x="20" y="105" font-family="monospace" font-size="8">
          SKU: ${labelData.sku}
        </text>
        <text x="180" y="105" text-anchor="end" font-family="monospace" font-size="8" font-weight="bold">
          ${labelData.price}
        </text>
      </svg>
    `

    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `barcode-${product.sku}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Generate labels data
  const labelsData: BarcodeLabelData[] = products.flatMap(product =>
    Array(labelsPerProduct).fill(null).map(() => ({
      sku: product.sku,
      barcode: generateEAN13FromSKU(product.sku),
      barcodeFormat: 'EAN13' as const,
      productName: product.nameEn,
      price: `$${Number(product.priceUsd).toFixed(2)}`,
      categoryName: product.category?.nameEn,
    }))
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Barcode Labels
          </DialogTitle>
        </DialogHeader>

        {/* Options */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b">
          <div className="space-y-2">
            <Label>Label Size</Label>
            <Select value={labelSize} onValueChange={(v) => setLabelSize(v as typeof labelSize)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (38x25mm)</SelectItem>
                <SelectItem value="medium">Medium (50x30mm)</SelectItem>
                <SelectItem value="large">Large (60x40mm)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Labels per Product</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={labelsPerProduct}
              onChange={(e) => setLabelsPerProduct(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="rounded"
              />
              Show Price
            </Label>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showCategory}
                onChange={(e) => setShowCategory(e.target.checked)}
                className="rounded"
              />
              Show Category
            </Label>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-4">
            Preview ({labelsData.length} label{labelsData.length !== 1 ? 's' : ''})
          </p>
          <div ref={printRef} className="flex flex-wrap gap-2 justify-center">
            {labelsData.map((label, i) => (
              <div key={i} className="border rounded shadow-sm">
                <BarcodeLabel
                  data={label}
                  size={labelSize}
                  showPrice={showPrice}
                  showCategory={showCategory}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDownloadSVG}>
            <Download className="h-4 w-4 mr-2" />
            Download SVG
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Single Product Label Button
interface PrintLabelButtonProps {
  product: {
    id: string
    sku: string
    nameEn: string
    priceUsd: number | string
    category?: { nameEn: string }
  }
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
}

export function PrintLabelButton({ product, variant = 'outline', size = 'icon' }: PrintLabelButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} title="Print barcode label">
        <Printer className="h-4 w-4" />
      </Button>
      <PrintPreviewDialog open={open} onOpenChange={setOpen} products={[product]} />
    </>
  )
}
