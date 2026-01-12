"use client"

import { useState, useEffect } from "react"
import { X, Download, Smartphone, Share, Plus, Check, RefreshCcw, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePWA } from "@/lib/use-pwa"

interface PWAInstallPromptProps {
  language?: "EN" | "KH"
}

const translations = {
  EN: {
    // Banner
    bannerTitle: "Install ApoloShop",
    bannerDescription: "Add to your home screen for quick access",
    install: "Install",
    notNow: "Not Now",
    // Dialog
    dialogTitle: "Install ApoloShop App",
    dialogDescription: "Get the best experience with our app",
    benefits: {
      title: "Why install?",
      offline: "Browse products offline",
      fast: "Faster loading times",
      notifications: "Get order updates",
      homescreen: "Quick access from home screen",
    },
    // iOS instructions
    iosTitle: "Install on iOS",
    iosStep1: "Tap the Share button",
    iosStep2: 'Select "Add to Home Screen"',
    iosStep3: 'Tap "Add" to confirm',
    // Update banner
    updateTitle: "Update Available",
    updateDescription: "A new version is available",
    updateNow: "Update Now",
    // Offline banner
    offlineTitle: "You're Offline",
    offlineDescription: "Some features may be limited",
    // Success
    installed: "App Installed!",
    installedDescription: "You can now access ApoloShop from your home screen",
  },
  KH: {
    // Banner
    bannerTitle: "ដំឡើង ApoloShop",
    bannerDescription: "បន្ថែមទៅអេក្រង់ដើមសម្រាប់ការចូលប្រើរហ័ស",
    install: "ដំឡើង",
    notNow: "មិនមែនឥឡូវ",
    // Dialog
    dialogTitle: "ដំឡើងកម្មវិធី ApoloShop",
    dialogDescription: "ទទួលបានបទពិសោធន៍ល្អបំផុតជាមួយកម្មវិធីរបស់យើង",
    benefits: {
      title: "ហេតុអ្វីដំឡើង?",
      offline: "រុករកផលិតផលពេលអហ្វឡាញ",
      fast: "ពេលវេលាផ្ទុកលឿនជាង",
      notifications: "ទទួលបានការធ្វើបច្ចុប្បន្នភាពការបញ្ជាទិញ",
      homescreen: "ការចូលប្រើរហ័សពីអេក្រង់ដើម",
    },
    // iOS instructions
    iosTitle: "ដំឡើងនៅលើ iOS",
    iosStep1: "ចុចប៊ូតុង Share",
    iosStep2: 'ជ្រើសរើស "Add to Home Screen"',
    iosStep3: 'ចុច "Add" ដើម្បីបញ្ជាក់',
    // Update banner
    updateTitle: "មានការធ្វើបច្ចុប្បន្នភាព",
    updateDescription: "កំណែថ្មីមួយអាចរកបាន",
    updateNow: "ធ្វើបច្ចុប្បន្នភាពឥឡូវ",
    // Offline banner
    offlineTitle: "អ្នកកំពុងអហ្វឡាញ",
    offlineDescription: "មុខងារមួយចំនួនអាចមានកម្រិត",
    // Success
    installed: "កម្មវិធីបានដំឡើង!",
    installedDescription: "ឥឡូវអ្នកអាចចូលប្រើ ApoloShop ពីអេក្រង់ដើមរបស់អ្នក",
  },
}

export function PWAInstallPrompt({ language = "EN" }: PWAInstallPromptProps) {
  const { isInstallable, isInstalled, promptInstall } = usePWA()
  const [showBanner, setShowBanner] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const t = translations[language]

  useEffect(() => {
    // Check if iOS device
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if user has dismissed the banner before
    const dismissed = localStorage.getItem("pwa-banner-dismissed")
    const dismissedTime = dismissed ? Number.parseInt(dismissed, 10) : 0
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    // Show banner if not dismissed recently and not already installed
    if (!isInstalled && dismissedTime < oneDayAgo) {
      // Delay showing the banner to not interrupt the user
      const timer = setTimeout(() => {
        if (isInstallable || iOS) {
          setShowBanner(true)
        }
      }, 30000) // Show after 30 seconds

      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled])

  const handleInstall = async () => {
    if (isIOS) {
      setShowDialog(true)
      setShowBanner(false)
      return
    }

    const success = await promptInstall()
    if (success) {
      setShowBanner(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString())
  }

  if (isInstalled) return null

  return (
    <>
      {/* Install banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg md:bottom-4 md:left-4 md:right-auto md:rounded-lg md:w-96 animate-in slide-in-from-bottom-4">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex gap-4 items-start pr-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{t.bannerTitle}</h3>
              <p className="text-sm text-gray-500 mt-1">{t.bannerDescription}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleInstall}>
                  <Download className="h-4 w-4 mr-2" />
                  {t.install}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  {t.notNow}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS installation instructions dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.iosTitle}</DialogTitle>
            <DialogDescription>{t.dialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold">1</span>
              </div>
              <div className="flex items-center gap-2">
                <Share className="h-5 w-5 text-primary" />
                <span>{t.iosStep1}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold">2</span>
              </div>
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <span>{t.iosStep2}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold">3</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>{t.iosStep3}</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">{t.benefits.title}</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                {t.benefits.offline}
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                {t.benefits.fast}
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                {t.benefits.homescreen}
              </li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Check className="h-5 w-5" />
          <span className="font-medium">{t.installed}</span>
        </div>
      )}
    </>
  )
}

// Update available banner component
export function PWAUpdateBanner({ language = "EN" }: PWAInstallPromptProps) {
  const { isUpdateAvailable, updateServiceWorker } = usePWA()
  const [showBanner, setShowBanner] = useState(false)

  const t = translations[language]

  useEffect(() => {
    if (isUpdateAvailable) {
      setShowBanner(true)
    }
  }, [isUpdateAvailable])

  if (!showBanner) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-center gap-4">
      <RefreshCcw className="h-5 w-5" />
      <span className="font-medium">{t.updateTitle}</span>
      <span className="text-sm opacity-80">{t.updateDescription}</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          updateServiceWorker()
          setShowBanner(false)
        }}
      >
        {t.updateNow}
      </Button>
      <button
        onClick={() => setShowBanner(false)}
        className="p-1 hover:bg-white/10 rounded"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Offline indicator component
export function OfflineIndicator({ language = "EN" }: PWAInstallPromptProps) {
  const { isOnline } = usePWA()

  const t = translations[language]

  if (isOnline) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-orange-500 text-white px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">{t.offlineTitle}</span>
      <span className="text-sm opacity-80">- {t.offlineDescription}</span>
    </div>
  )
}
