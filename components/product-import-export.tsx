"use client"

import { useState, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, Download, FileText, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useImportProducts, exportProducts, ImportResult, ImportRowError } from "@/lib/api-hooks"

interface ProductImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductImportDialog({ open, onOpenChange }: ProductImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [isDryRun, setIsDryRun] = useState(true) // Default to dry run for safety
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importStage, setImportStage] = useState<"select" | "validating" | "importing" | "complete">("select")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importMutation = useImportProducts()

  const resetState = useCallback(() => {
    setFile(null)
    setUpdateExisting(false)
    setIsDryRun(true)
    setResult(null)
    setImportStage("select")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleValidate = async () => {
    if (!file) return

    setImportStage("validating")
    try {
      const result = await importMutation.mutateAsync({
        file,
        updateExisting,
        dryRun: true,
      })
      setResult(result)
      setImportStage("complete")
    } catch {
      setImportStage("select")
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImportStage("importing")
    try {
      const result = await importMutation.mutateAsync({
        file,
        updateExisting,
        dryRun: false,
      })
      setResult(result)
      setImportStage("complete")
    } catch {
      setImportStage("complete")
    }
  }

  const handleStartNewImport = () => {
    resetState()
  }

  // Progress calculation for visual feedback
  const getProgress = () => {
    if (importStage === "select") return 0
    if (importStage === "validating") return 33
    if (importStage === "importing") return 66
    if (importStage === "complete") return 100
    return 0
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={20} />
            Import Products from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import products into your shop.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress indicator */}
          {importStage !== "select" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {importStage === "validating" && "Validating CSV..."}
                  {importStage === "importing" && "Importing products..."}
                  {importStage === "complete" && "Complete"}
                </span>
                <span>{getProgress()}%</span>
              </div>
              <Progress value={getProgress()} className="h-2" />
            </div>
          )}

          {/* File selection */}
          {importStage === "select" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="csvFile">CSV File</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="text-primary" size={24} />
                      <span className="font-medium">{file.name}</span>
                      <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto text-muted-foreground" size={32} />
                      <p className="text-sm text-muted-foreground">
                        Click to select a CSV file or drag and drop
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="csvFile"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="updateExisting"
                    checked={updateExisting}
                    onCheckedChange={setUpdateExisting}
                  />
                  <Label htmlFor="updateExisting" className="text-sm">
                    Update existing products (by SKU)
                  </Label>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>CSV Format</AlertTitle>
                <AlertDescription className="text-xs">
                  Required columns: <code>sku, nameEn, nameKh, priceUsd, priceKhr, categorySlug</code>
                  <br />
                  Optional: <code>descriptionEn, descriptionKh, stock, minStockLevel, imageUrl, images, isActive</code>
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Loading state */}
          {(importStage === "validating" || importStage === "importing") && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                {importStage === "validating" ? "Validating your CSV file..." : "Importing products..."}
              </p>
            </div>
          )}

          {/* Results */}
          {importStage === "complete" && result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold">{result.totalRows}</div>
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.dryRun ? result.pendingCreates ?? 0 : result.imported}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {result.dryRun ? "To Create" : "Created"}
                  </div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.dryRun ? result.pendingUpdates ?? 0 : result.updated}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {result.dryRun ? "To Update" : "Updated"}
                  </div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </Card>
              </div>

              {/* Status message */}
              {result.dryRun ? (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertTitle>Validation Complete</AlertTitle>
                  <AlertDescription>
                    This is a dry run. No changes have been made. Review the results and click
                    &quot;Import Now&quot; to proceed.
                  </AlertDescription>
                </Alert>
              ) : result.success ? (
                <Alert className="border-green-500">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle>Import Successful</AlertTitle>
                  <AlertDescription>
                    Successfully imported {result.imported} new products and updated {result.updated} existing products.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Import Completed with Errors</AlertTitle>
                  <AlertDescription>
                    {result.failed} rows failed. See error details below.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error details */}
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <Label>Errors ({result.errors.length})</Label>
                  <ScrollArea className="h-[150px] border rounded-md">
                    <div className="p-2 space-y-1">
                      {result.errors.map((error: ImportRowError, idx: number) => (
                        <div
                          key={idx}
                          className="text-xs p-2 bg-red-50 dark:bg-red-950/20 rounded flex items-start gap-2"
                        >
                          <Badge variant="destructive" className="shrink-0">
                            Row {error.row}
                          </Badge>
                          <span>
                            {error.field && <strong className="text-red-600">{error.field}:</strong>}{" "}
                            {error.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {importStage === "select" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleValidate} disabled={!file || importMutation.isPending}>
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Validate CSV"
                )}
              </Button>
            </>
          )}

          {importStage === "complete" && result?.dryRun && (
            <>
              <Button variant="outline" onClick={handleStartNewImport}>
                Start Over
              </Button>
              <Button
                onClick={handleImport}
                disabled={result.failed === result.totalRows || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import ${(result.pendingCreates ?? 0) + (result.pendingUpdates ?? 0)} Products`
                )}
              </Button>
            </>
          )}

          {importStage === "complete" && !result?.dryRun && (
            <>
              <Button variant="outline" onClick={handleStartNewImport}>
                Import More
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ProductExportButtonProps {
  categoryId?: string
  isActive?: boolean
  variant?: "default" | "outline" | "ghost"
  className?: string
}

export function ProductExportButton({
  categoryId,
  isActive,
  variant = "outline",
  className,
}: ProductExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportProducts({
        categoryId: categoryId === "all" ? undefined : categoryId,
        isActive,
      })
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant={variant}
      onClick={handleExport}
      disabled={isExporting}
      className={className}
    >
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </>
      )}
    </Button>
  )
}
