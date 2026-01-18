"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, ScanLine, X, Keyboard, AlertCircle } from "lucide-react"
import { validateBarcode, BarcodeInfo } from "@/lib/sku-barcode-utils"

interface BarcodeScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (barcode: string, info: BarcodeInfo) => void
  title?: string
  description?: string
}

export function BarcodeScanner({
  open,
  onOpenChange,
  onScan,
  title = "Scan Barcode",
  description = "Position the barcode within the frame to scan",
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualInput, setManualInput] = useState("")
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [hasCamera, setHasCamera] = useState(true)

  // Check if BarcodeDetector API is available
  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    setManualMode(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsScanning(true)
        setHasCamera(true)

        // Start scanning loop
        if (hasBarcodeDetector) {
          startBarcodeDetection()
        }
      }
    } catch (err) {
      console.error('Camera error:', err)
      setHasCamera(false)
      setError('Camera access denied. Please use manual input.')
      setManualMode(true)
    }
  }, [hasBarcodeDetector])

  const startBarcodeDetection = useCallback(async () => {
    if (!hasBarcodeDetector || !videoRef.current || !canvasRef.current) return

    // @ts-expect-error BarcodeDetector API not in TypeScript types yet
    const barcodeDetector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
    })

    const detectBarcode = async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) {
        animationRef.current = requestAnimationFrame(detectBarcode)
        return
      }

      try {
        const barcodes = await barcodeDetector.detect(videoRef.current)

        if (barcodes.length > 0) {
          const barcode = barcodes[0]
          const value = barcode.rawValue

          // Prevent duplicate scans
          if (value !== lastScanned) {
            setLastScanned(value)
            const info = validateBarcode(value)
            onScan(value, info)
            stopCamera()
            onOpenChange(false)
            return
          }
        }
      } catch {
        // Detection failed, continue scanning
      }

      animationRef.current = requestAnimationFrame(detectBarcode)
    }

    detectBarcode()
  }, [hasBarcodeDetector, lastScanned, onScan, onOpenChange, stopCamera])

  // Start camera when dialog opens
  useEffect(() => {
    if (open && !manualMode) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [open, manualMode, startCamera, stopCamera])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return

    const info = validateBarcode(manualInput.trim())
    onScan(manualInput.trim().toUpperCase(), info)
    setManualInput("")
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSubmit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {manualMode ? <Keyboard className="h-5 w-5" /> : <ScanLine className="h-5 w-5" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            {manualMode
              ? "Enter barcode or SKU manually"
              : description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!manualMode ? (
            <>
              {/* Camera View */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning overlay */}
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-32 border-2 border-primary rounded-lg relative">
                      {/* Scanning line animation */}
                      <div className="absolute inset-x-0 h-0.5 bg-primary animate-scan" />
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />
                    </div>
                  </div>
                )}

                {/* Error overlay */}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center p-4">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                      <p className="text-sm text-white">{error}</p>
                    </div>
                  </div>
                )}

                {/* Loading state */}
                {!isScanning && !error && !manualMode && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center">
                      <Camera className="h-8 w-8 mx-auto mb-2 text-white animate-pulse" />
                      <p className="text-sm text-white">Starting camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* No BarcodeDetector warning */}
              {!hasBarcodeDetector && isScanning && (
                <div className="p-3 bg-warning/10 border border-warning rounded-lg">
                  <p className="text-sm text-warning-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Barcode detection not supported in this browser. Use manual input.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setManualMode(true)}
                  className="flex-1"
                >
                  <Keyboard className="h-4 w-4 mr-2" />
                  Manual Input
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Manual Input Mode */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode-input">Barcode / SKU</Label>
                  <Input
                    id="barcode-input"
                    placeholder="Enter barcode or SKU..."
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports EAN-13, EAN-8, UPC, CODE128, or custom SKU
                  </p>
                </div>

                <div className="flex gap-2">
                  {hasCamera && (
                    <Button
                      variant="outline"
                      onClick={() => setManualMode(false)}
                      className="flex-1"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Use Camera
                    </Button>
                  )}
                  <Button onClick={handleManualSubmit} className="flex-1">
                    Submit
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <style jsx>{`
          @keyframes scan {
            0%, 100% {
              top: 10%;
            }
            50% {
              top: 90%;
            }
          }
          .animate-scan {
            animation: scan 2s ease-in-out infinite;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}

// Inline scanner for embedding in pages
interface InlineBarcodeScannerProps {
  onScan: (barcode: string, info: BarcodeInfo) => void
  className?: string
}

export function InlineBarcodeScanner({ onScan, className = "" }: InlineBarcodeScannerProps) {
  const [input, setInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const info = validateBarcode(input.trim())
    onScan(input.trim().toUpperCase(), info)
    setInput("")
  }

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <Input
        placeholder="Scan or enter barcode/SKU..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" size="icon" variant="outline">
        <ScanLine className="h-4 w-4" />
      </Button>
    </form>
  )
}
