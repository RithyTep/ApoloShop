"use client"

import { useState, useCallback } from "react"
import { Shield, ShieldCheck, ShieldOff, Key, Download, Copy, RefreshCw, AlertTriangle, Check, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { translations } from "@/lib/i18n"

interface TwoFactorSettingsProps {
  language?: "EN" | "KH"
}

interface TwoFactorStatus {
  enabled: boolean
  hasPendingSetup: boolean
  recoveryCodesRemaining: number | null
  lowRecoveryCodes: boolean
}

interface SetupData {
  secret: string
  qrCode: string
  recoveryCodes: string[]
}

export function TwoFactorSettings({ language = "EN" }: TwoFactorSettingsProps) {
  const t = translations[language === "EN" ? "en" : "kh"].twoFactor

  // State
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Setup dialog state
  const [setupDialogOpen, setSetupDialogOpen] = useState(false)
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [setupStep, setSetupStep] = useState<"qr" | "recovery">("qr")
  const [verifyCode, setVerifyCode] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [codesSaved, setCodesSaved] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Disable dialog state
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [disablePassword, setDisablePassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [disabling, setDisabling] = useState(false)

  // Recovery codes dialog state
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false)
  const [regeneratePassword, setRegeneratePassword] = useState("")
  const [regenerateCode, setRegenerateCode] = useState("")
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[] | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  // Fetch 2FA status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/2fa/status")
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (err) {
      console.error("Failed to fetch 2FA status:", err)
    }
  }, [])

  // Initial load
  useState(() => {
    fetchStatus()
  })

  // Start 2FA setup
  const startSetup = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/auth/2fa/setup", { method: "POST" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to start setup")
      }
      const data = await response.json()
      setSetupData(data)
      setSetupStep("qr")
      setSetupDialogOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed")
    } finally {
      setLoading(false)
    }
  }

  // Verify setup code
  const verifySetup = async () => {
    setVerifying(true)
    setError(null)
    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Verification failed")
      }
      // Success - show recovery codes
      setSetupStep("recovery")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setVerifying(false)
    }
  }

  // Complete setup
  const completeSetup = () => {
    setSetupDialogOpen(false)
    setSetupData(null)
    setSetupStep("qr")
    setVerifyCode("")
    setCodesSaved(false)
    fetchStatus()
  }

  // Cancel setup
  const cancelSetup = async () => {
    try {
      await fetch("/api/auth/2fa/setup", { method: "DELETE" })
    } catch (err) {
      console.error("Failed to cancel setup:", err)
    }
    setSetupDialogOpen(false)
    setSetupData(null)
    setSetupStep("qr")
    setVerifyCode("")
    setCodesSaved(false)
  }

  // Disable 2FA
  const disable2FA = async () => {
    setDisabling(true)
    setError(null)
    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to disable 2FA")
      }
      setDisableDialogOpen(false)
      setDisablePassword("")
      fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable")
    } finally {
      setDisabling(false)
    }
  }

  // Regenerate recovery codes
  const regenerateRecoveryCodes = async () => {
    setRegenerating(true)
    setError(null)
    try {
      const response = await fetch("/api/auth/2fa/recovery-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: regeneratePassword,
          code: regenerateCode,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to regenerate codes")
      }
      const data = await response.json()
      setRegeneratedCodes(data.recoveryCodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate")
    } finally {
      setRegenerating(false)
    }
  }

  // Copy recovery codes to clipboard
  const copyRecoveryCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join("\n"))
  }

  // Download recovery codes as text file
  const downloadRecoveryCodes = (codes: string[]) => {
    const content = `ApoloShop 2FA Recovery Codes\n${"=".repeat(30)}\n\n${codes.join("\n")}\n\nStore these codes in a safe place. Each code can only be used once.`
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "apoloshop-recovery-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status?.enabled ? (
              <>
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <Badge variant="default" className="bg-green-500">
                  {t.enabled}
                </Badge>
              </>
            ) : (
              <>
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
                <Badge variant="secondary">{t.disabled}</Badge>
              </>
            )}
          </div>
        </div>

        {/* Low recovery codes warning */}
        {status?.enabled && status.lowRecoveryCodes && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t.lowCodesWarning}</AlertTitle>
            <AlertDescription>
              {status.recoveryCodesRemaining} {t.remainingCodes}
            </AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {status?.enabled ? (
            <>
              {/* Recovery codes management */}
              <Dialog open={recoveryDialogOpen} onOpenChange={setRecoveryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Key className="mr-2 h-4 w-4" />
                    {t.recoveryCodes}
                    {status.recoveryCodesRemaining !== null && (
                      <Badge variant="secondary" className="ml-2">
                        {status.recoveryCodesRemaining}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t.regenerateCodes}</DialogTitle>
                    <DialogDescription>{t.regenerateWarning}</DialogDescription>
                  </DialogHeader>

                  {regeneratedCodes ? (
                    <div className="space-y-4">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{t.recoveryCodesWarning}</AlertDescription>
                      </Alert>
                      <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted p-4 rounded-lg">
                        {regeneratedCodes.map((code, i) => (
                          <div key={i} className="py-1">
                            {code}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyRecoveryCodes(regeneratedCodes)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {t.copyCodes}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadRecoveryCodes(regeneratedCodes)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {t.downloadCodes}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t.passwordRequired}</Label>
                        <Input
                          type="password"
                          value={regeneratePassword}
                          onChange={(e) => setRegeneratePassword(e.target.value)}
                          placeholder={t.passwordPlaceholder}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.enterCode}</Label>
                        <Input
                          type="text"
                          value={regenerateCode}
                          onChange={(e) => setRegenerateCode(e.target.value)}
                          placeholder={t.codePlaceholder}
                          maxLength={6}
                        />
                      </div>
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  <DialogFooter>
                    {regeneratedCodes ? (
                      <Button
                        onClick={() => {
                          setRecoveryDialogOpen(false)
                          setRegeneratedCodes(null)
                          setRegeneratePassword("")
                          setRegenerateCode("")
                          fetchStatus()
                        }}
                      >
                        {t.close}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setRecoveryDialogOpen(false)
                            setRegeneratePassword("")
                            setRegenerateCode("")
                          }}
                        >
                          {t.cancel}
                        </Button>
                        <Button
                          onClick={regenerateRecoveryCodes}
                          disabled={
                            regenerating ||
                            !regeneratePassword ||
                            regenerateCode.length !== 6
                          }
                        >
                          {regenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {regenerating ? t.regenerating : t.regenerateCodes}
                        </Button>
                      </>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Disable 2FA */}
              <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <ShieldOff className="mr-2 h-4 w-4" />
                    {t.disable}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t.disableTitle}</DialogTitle>
                    <DialogDescription>{t.disableDescription}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t.enterPassword}</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={disablePassword}
                          onChange={(e) => setDisablePassword(e.target.value)}
                          placeholder={t.passwordPlaceholder}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDisableDialogOpen(false)
                        setDisablePassword("")
                        setError(null)
                      }}
                    >
                      {t.cancel}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={disable2FA}
                      disabled={disabling || !disablePassword}
                    >
                      {disabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {disabling ? t.disabling : t.disableButton}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            /* Enable 2FA */
            <Dialog open={setupDialogOpen} onOpenChange={(open) => {
              if (!open) cancelSetup()
            }}>
              <DialogTrigger asChild>
                <Button onClick={startSetup} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {t.enable}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                {setupStep === "qr" ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>{t.setupTitle}</DialogTitle>
                      <DialogDescription>{t.setupDescription}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* QR Code */}
                      {setupData?.qrCode && (
                        <div className="flex justify-center">
                          <img
                            src={setupData.qrCode}
                            alt="2FA QR Code"
                            className="rounded-lg border"
                          />
                        </div>
                      )}

                      {/* Manual entry */}
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          {t.cantScan} {t.manualEntry}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type={showSecret ? "text" : "password"}
                            value={setupData?.secret || ""}
                            readOnly
                            className="font-mono"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowSecret(!showSecret)}
                          >
                            {showSecret ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setupData?.secret &&
                              navigator.clipboard.writeText(setupData.secret)
                            }
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Verification code input */}
                      <div className="space-y-2">
                        <Label>{t.enterCode}</Label>
                        <Input
                          type="text"
                          value={verifyCode}
                          onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                          placeholder={t.codePlaceholder}
                          maxLength={6}
                          className="text-center font-mono text-2xl tracking-widest"
                        />
                      </div>

                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={cancelSetup}>
                        {t.cancel}
                      </Button>
                      <Button
                        onClick={verifySetup}
                        disabled={verifying || verifyCode.length !== 6}
                      >
                        {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {verifying ? t.verifying : t.verifySetup}
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  /* Recovery codes step */
                  <>
                    <DialogHeader>
                      <DialogTitle>{t.recoveryCodesTitle}</DialogTitle>
                      <DialogDescription>
                        {t.recoveryCodesDescription}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{t.recoveryCodesWarning}</AlertDescription>
                      </Alert>
                      <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted p-4 rounded-lg">
                        {setupData?.recoveryCodes.map((code, i) => (
                          <div key={i} className="py-1">
                            {code}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setupData && copyRecoveryCodes(setupData.recoveryCodes)
                          }
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {t.copyCodes}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setupData && downloadRecoveryCodes(setupData.recoveryCodes)
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {t.downloadCodes}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="codes-saved"
                          checked={codesSaved}
                          onChange={(e) => setCodesSaved(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="codes-saved" className="cursor-pointer">
                          {t.iSavedCodes}
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={completeSetup} disabled={!codesSaved}>
                        <Check className="mr-2 h-4 w-4" />
                        {t.close}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Error display outside dialogs */}
        {error && !setupDialogOpen && !disableDialogOpen && !recoveryDialogOpen && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
