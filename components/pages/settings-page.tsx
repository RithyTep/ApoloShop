"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useSettings, useUpdateSettings, useComponentRegistry, useUpdateComponentRegistry, ComponentRegistryConfigData } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import { getAllComponents, getDefaultConfig, mergeWithDefaults, type ComponentRegistration } from "@/lib/component-registry"
import { ClientThemeEditor } from "@/components/client-theme-editor"
import { type GA4Settings } from "@/providers/ga4-provider"
import { type FBPixelSettings } from "@/providers/fb-pixel-provider"
import { SUPPORTED_LANGUAGES, LANGUAGE_CONFIG, type Language } from "@/lib/i18n"
import { Globe, Check } from "lucide-react"

export function SettingsPage() {
  const { toast } = useToast()
  const { data, isLoading } = useSettings()
  const updateMutation = useUpdateSettings()
  const { data: registryData } = useComponentRegistry()
  const updateRegistryMutation = useUpdateComponentRegistry()

  // Get all registered components for display
  const registeredComponents = getAllComponents()

  const [shopInfo, setShopInfo] = useState({
    shopName: "",
    address: "",
    phone: "",
    facebookUrl: "",
    telegramUrl: "",
    instagramUrl: "",
  })

  const [currencySettings, setCurrencySettings] = useState({
    defaultCurrency: "USD",
    usdToKhrRate: 4100,
    enableKhr: true,
    enableUsd: true,
  })

  // GA4 Analytics settings
  const [ga4Settings, setGa4Settings] = useState<GA4Settings>({
    enabled: false,
    measurementId: "",
    enhancedConversions: true,
    debugMode: false,
  })

  // Facebook Pixel settings
  const [fbPixelSettings, setFbPixelSettings] = useState<FBPixelSettings>({
    enabled: false,
    pixelId: "",
    enableConversionsApi: false,
    accessToken: "",
    testEventCode: "",
    debugMode: false,
  })

  // Language settings state
  const [languageSettings, setLanguageSettings] = useState({
    defaultLanguage: "en" as Language,
    enabledLanguages: ["en", "kh"] as Language[],
    autoDetect: true,
  })

  // Component registry state
  const [componentConfig, setComponentConfig] = useState<ComponentRegistryConfigData>(() => getDefaultConfig())

  // Load component registry config when available
  useEffect(() => {
    if (registryData?.config) {
      setComponentConfig(mergeWithDefaults(registryData.config))
    }
  }, [registryData])

  // Load settings when data is available
  useEffect(() => {
    if (data?.settings) {
      const s = data.settings as Record<string, unknown>
      setShopInfo({
        shopName: (s.shopName as string) || "",
        address: (s.address as string) || "",
        phone: (s.phone as string) || "",
        facebookUrl: (s.socialLinks as Record<string, string>)?.facebook || "",
        telegramUrl: (s.socialLinks as Record<string, string>)?.telegram || "",
        instagramUrl: (s.socialLinks as Record<string, string>)?.instagram || "",
      })
      setCurrencySettings({
        defaultCurrency: (s.defaultCurrency as string) || "USD",
        usdToKhrRate: (s.exchangeRate as number) || 4100,
        enableKhr: (s.enableKhr as boolean) ?? true,
        enableUsd: (s.enableUsd as boolean) ?? true,
      })
      // Load GA4 settings
      if (s.ga4) {
        const ga4 = s.ga4 as GA4Settings
        setGa4Settings({
          enabled: ga4.enabled ?? false,
          measurementId: ga4.measurementId || "",
          enhancedConversions: ga4.enhancedConversions ?? true,
          debugMode: ga4.debugMode ?? false,
        })
      }
      // Load FB Pixel settings
      if (s.fbPixel) {
        const fbPixel = s.fbPixel as FBPixelSettings
        setFbPixelSettings({
          enabled: fbPixel.enabled ?? false,
          pixelId: fbPixel.pixelId || "",
          enableConversionsApi: fbPixel.enableConversionsApi ?? false,
          accessToken: fbPixel.accessToken || "",
          testEventCode: fbPixel.testEventCode || "",
          debugMode: fbPixel.debugMode ?? false,
        })
      }
      // Load Language settings
      if (s.language) {
        const langSettings = s.language as { defaultLanguage?: Language; enabledLanguages?: Language[]; autoDetect?: boolean }
        setLanguageSettings({
          defaultLanguage: langSettings.defaultLanguage ?? "en",
          enabledLanguages: langSettings.enabledLanguages ?? ["en", "kh"],
          autoDetect: langSettings.autoDetect ?? true,
        })
      }
    }
  }, [data])

  const handleSaveShopInfo = async () => {
    try {
      await updateMutation.mutateAsync({
        shopName: shopInfo.shopName,
        address: shopInfo.address,
        phone: shopInfo.phone,
        socialLinks: {
          facebook: shopInfo.facebookUrl,
          telegram: shopInfo.telegramUrl,
          instagram: shopInfo.instagramUrl,
        },
      })
      toast({ title: "Shop information saved successfully" })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleSaveCurrency = async () => {
    try {
      await updateMutation.mutateAsync({
        defaultCurrency: currencySettings.defaultCurrency,
        exchangeRate: currencySettings.usdToKhrRate,
        enableKhr: currencySettings.enableKhr,
        enableUsd: currencySettings.enableUsd,
      })
      toast({ title: "Currency settings saved successfully" })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleSaveLanguage = async () => {
    // Ensure at least one language is enabled
    if (languageSettings.enabledLanguages.length === 0) {
      toast({
        title: "No Languages Enabled",
        description: "At least one language must be enabled",
        variant: "destructive",
      })
      return
    }

    // Ensure default language is in enabled languages
    if (!languageSettings.enabledLanguages.includes(languageSettings.defaultLanguage)) {
      toast({
        title: "Invalid Default Language",
        description: "Default language must be one of the enabled languages",
        variant: "destructive",
      })
      return
    }

    try {
      await updateMutation.mutateAsync({
        language: {
          defaultLanguage: languageSettings.defaultLanguage,
          enabledLanguages: languageSettings.enabledLanguages,
          autoDetect: languageSettings.autoDetect,
        },
      })
      toast({ title: "Language settings saved successfully" })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleToggleLanguage = (lang: Language) => {
    setLanguageSettings((prev) => {
      const isEnabled = prev.enabledLanguages.includes(lang)
      if (isEnabled) {
        // Don't allow disabling if it's the last language
        if (prev.enabledLanguages.length === 1) return prev
        // If disabling the default language, switch default to first remaining
        const newEnabled = prev.enabledLanguages.filter((l) => l !== lang)
        const newDefault = prev.defaultLanguage === lang ? newEnabled[0] : prev.defaultLanguage
        return { ...prev, enabledLanguages: newEnabled, defaultLanguage: newDefault }
      } else {
        return { ...prev, enabledLanguages: [...prev.enabledLanguages, lang] }
      }
    })
  }

  const handleSaveGA4 = async () => {
    // Validate measurement ID format if enabled
    if (ga4Settings.enabled && ga4Settings.measurementId) {
      const isValidId = /^G-[A-Z0-9]{10}$/.test(ga4Settings.measurementId.toUpperCase())
      if (!isValidId) {
        toast({
          title: "Invalid Measurement ID",
          description: "GA4 Measurement ID should be in format G-XXXXXXXXXX",
          variant: "destructive",
        })
        return
      }
    }

    try {
      await updateMutation.mutateAsync({
        ga4: {
          enabled: ga4Settings.enabled,
          measurementId: ga4Settings.measurementId.toUpperCase(),
          enhancedConversions: ga4Settings.enhancedConversions,
          debugMode: ga4Settings.debugMode,
        },
      })
      toast({ title: "Google Analytics settings saved successfully" })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleSaveFBPixel = async () => {
    // Validate pixel ID format if enabled
    if (fbPixelSettings.enabled && fbPixelSettings.pixelId) {
      const isValidId = /^\d{15,16}$/.test(fbPixelSettings.pixelId)
      if (!isValidId) {
        toast({
          title: "Invalid Pixel ID",
          description: "Facebook Pixel ID should be a 15-16 digit number",
          variant: "destructive",
        })
        return
      }
    }

    // Validate access token if Conversions API is enabled
    if (fbPixelSettings.enableConversionsApi && !fbPixelSettings.accessToken) {
      toast({
        title: "Access Token Required",
        description: "Conversions API requires a valid access token",
        variant: "destructive",
      })
      return
    }

    try {
      await updateMutation.mutateAsync({
        fbPixel: {
          enabled: fbPixelSettings.enabled,
          pixelId: fbPixelSettings.pixelId,
          enableConversionsApi: fbPixelSettings.enableConversionsApi,
          accessToken: fbPixelSettings.accessToken,
          testEventCode: fbPixelSettings.testEventCode,
          debugMode: fbPixelSettings.debugMode,
        },
      })
      toast({ title: "Facebook Pixel settings saved successfully" })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  const handleToggleComponent = (componentId: string, enabled: boolean) => {
    setComponentConfig((prev) => ({
      ...prev,
      components: {
        ...prev.components,
        [componentId]: {
          ...prev.components[componentId],
          id: componentId,
          enabled,
        },
      },
    }))
  }

  const handleSaveComponents = async () => {
    try {
      await updateRegistryMutation.mutateAsync(componentConfig)
      toast({ title: "Component settings saved successfully" })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Configure your shop settings</p>
        </div>
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Configure your shop settings</p>
      </div>

      {/* Shop Info */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Shop Information</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="shopName">Shop Name</Label>
            <Input
              id="shopName"
              value={shopInfo.shopName}
              onChange={(e) => setShopInfo({ ...shopInfo, shopName: e.target.value })}
              className="border-border mt-1"
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={shopInfo.address}
              onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })}
              className="border-border mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={shopInfo.phone}
              onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })}
              className="border-border mt-1"
            />
          </div>
          <div>
            <Label>Social Links</Label>
            <div className="space-y-2 mt-1">
              <Input
                placeholder="Facebook URL"
                value={shopInfo.facebookUrl}
                onChange={(e) => setShopInfo({ ...shopInfo, facebookUrl: e.target.value })}
                className="border-border"
              />
              <Input
                placeholder="Telegram URL"
                value={shopInfo.telegramUrl}
                onChange={(e) => setShopInfo({ ...shopInfo, telegramUrl: e.target.value })}
                className="border-border"
              />
              <Input
                placeholder="Instagram URL"
                value={shopInfo.instagramUrl}
                onChange={(e) => setShopInfo({ ...shopInfo, instagramUrl: e.target.value })}
                className="border-border"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveShopInfo}
            disabled={updateMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Card>

      {/* Currency Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Currency Settings</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="defaultCurrency">Default Currency</Label>
            <Select
              value={currencySettings.defaultCurrency}
              onValueChange={(value) => setCurrencySettings({ ...currencySettings, defaultCurrency: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="KHR">KHR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="exchangeRate">USD to KHR Rate</Label>
            <Input
              id="exchangeRate"
              type="number"
              value={currencySettings.usdToKhrRate}
              onChange={(e) => setCurrencySettings({ ...currencySettings, usdToKhrRate: parseInt(e.target.value) || 4100 })}
              className="border-border mt-1"
            />
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="enableKhr"
                checked={currencySettings.enableKhr}
                onCheckedChange={(checked) => setCurrencySettings({ ...currencySettings, enableKhr: checked })}
              />
              <Label htmlFor="enableKhr" className="text-sm">Enable KHR</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="enableUsd"
                checked={currencySettings.enableUsd}
                onCheckedChange={(checked) => setCurrencySettings({ ...currencySettings, enableUsd: checked })}
              />
              <Label htmlFor="enableUsd" className="text-sm">Enable USD</Label>
            </div>
          </div>
          <Button
            onClick={handleSaveCurrency}
            disabled={updateMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Card>

      {/* Language Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Language Settings</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Configure supported languages for your shop. Thai, Vietnamese, and Chinese are available for Southeast Asian markets.
        </p>
        <div className="space-y-4">
          <div>
            <Label className="font-medium mb-3 block">Enabled Languages</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select which languages your customers can use.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const config = LANGUAGE_CONFIG[lang]
                const isEnabled = languageSettings.enabledLanguages.includes(lang)
                const isDefault = languageSettings.defaultLanguage === lang
                return (
                  <div
                    key={lang}
                    onClick={() => handleToggleLanguage(lang)}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      isEnabled
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.flag}</span>
                      <div>
                        <span className="text-sm font-medium">{config.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">({config.nativeName})</span>
                      </div>
                    </div>
                    {isEnabled && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="defaultLanguage" className="font-medium">Default Language</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Language to use when no preference is detected.
            </p>
            <Select
              value={languageSettings.defaultLanguage}
              onValueChange={(value) => setLanguageSettings({ ...languageSettings, defaultLanguage: value as Language })}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageSettings.enabledLanguages.map((lang) => {
                  const config = LANGUAGE_CONFIG[lang]
                  return (
                    <SelectItem key={lang} value={lang}>
                      <span className="flex items-center gap-2">
                        <span>{config.flag}</span>
                        <span>{config.name}</span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoDetect" className="font-medium">Auto-detect Browser Language</Label>
              <p className="text-sm text-muted-foreground">
                Automatically detect and use the customer&apos;s browser language preference.
              </p>
            </div>
            <Switch
              id="autoDetect"
              checked={languageSettings.autoDetect}
              onCheckedChange={(checked) => setLanguageSettings({ ...languageSettings, autoDetect: checked })}
            />
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              Note: RTL languages (Arabic, Hebrew) are planned for future release. All enabled languages support bidirectional text rendering when ready.
            </p>
          </div>

          <Button
            onClick={handleSaveLanguage}
            disabled={updateMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {updateMutation.isPending ? "Saving..." : "Save Language Settings"}
          </Button>
        </div>
      </Card>

      {/* Google Analytics 4 Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Google Analytics 4</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Track user behavior and e-commerce events with Google Analytics 4.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ga4Enabled" className="font-medium">Enable GA4 Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Inject GA4 tracking code into your shop
              </p>
            </div>
            <Switch
              id="ga4Enabled"
              checked={ga4Settings.enabled}
              onCheckedChange={(checked) => setGa4Settings({ ...ga4Settings, enabled: checked })}
            />
          </div>

          <div>
            <Label htmlFor="measurementId">Measurement ID</Label>
            <Input
              id="measurementId"
              placeholder="G-XXXXXXXXXX"
              value={ga4Settings.measurementId}
              onChange={(e) => setGa4Settings({ ...ga4Settings, measurementId: e.target.value })}
              className="border-border mt-1 font-mono"
              disabled={!ga4Settings.enabled}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Find this in Google Analytics &gt; Admin &gt; Data Streams
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enhancedConversions" className="font-medium">Enhanced Conversions</Label>
              <p className="text-sm text-muted-foreground">
                Improve conversion attribution with hashed customer data
              </p>
            </div>
            <Switch
              id="enhancedConversions"
              checked={ga4Settings.enhancedConversions}
              onCheckedChange={(checked) => setGa4Settings({ ...ga4Settings, enhancedConversions: checked })}
              disabled={!ga4Settings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="debugMode" className="font-medium">Debug Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable debug mode for testing (view events in GA4 DebugView)
              </p>
            </div>
            <Switch
              id="debugMode"
              checked={ga4Settings.debugMode}
              onCheckedChange={(checked) => setGa4Settings({ ...ga4Settings, debugMode: checked })}
              disabled={!ga4Settings.enabled}
            />
          </div>

          {ga4Settings.enabled && (
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-medium text-sm mb-2">Tracked E-commerce Events</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>view_item - Product page views</li>
                <li>add_to_cart - Add to cart actions</li>
                <li>remove_from_cart - Remove from cart actions</li>
                <li>view_cart - Cart page views</li>
                <li>begin_checkout - Checkout initiated</li>
                <li>purchase - Completed purchases</li>
                <li>search - Product searches</li>
              </ul>
            </div>
          )}

          <Button
            onClick={handleSaveGA4}
            disabled={updateMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {updateMutation.isPending ? "Saving..." : "Save Analytics Settings"}
          </Button>
        </div>
      </Card>

      {/* Facebook Pixel Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Facebook Pixel</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Track conversions for Facebook and Instagram ads with Meta Pixel.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="fbPixelEnabled" className="font-medium">Enable Facebook Pixel</Label>
              <p className="text-sm text-muted-foreground">
                Inject Meta Pixel code into your shop
              </p>
            </div>
            <Switch
              id="fbPixelEnabled"
              checked={fbPixelSettings.enabled}
              onCheckedChange={(checked) => setFbPixelSettings({ ...fbPixelSettings, enabled: checked })}
            />
          </div>

          <div>
            <Label htmlFor="pixelId">Pixel ID</Label>
            <Input
              id="pixelId"
              placeholder="123456789012345"
              value={fbPixelSettings.pixelId}
              onChange={(e) => setFbPixelSettings({ ...fbPixelSettings, pixelId: e.target.value })}
              className="border-border mt-1 font-mono"
              disabled={!fbPixelSettings.enabled}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Find this in Meta Events Manager &gt; Data Sources &gt; Your Pixel
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableConversionsApi" className="font-medium">Conversions API</Label>
              <p className="text-sm text-muted-foreground">
                Enable server-side event tracking for improved attribution
              </p>
            </div>
            <Switch
              id="enableConversionsApi"
              checked={fbPixelSettings.enableConversionsApi}
              onCheckedChange={(checked) => setFbPixelSettings({ ...fbPixelSettings, enableConversionsApi: checked })}
              disabled={!fbPixelSettings.enabled}
            />
          </div>

          {fbPixelSettings.enableConversionsApi && (
            <div>
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="EAABsbCS..."
                value={fbPixelSettings.accessToken}
                onChange={(e) => setFbPixelSettings({ ...fbPixelSettings, accessToken: e.target.value })}
                className="border-border mt-1 font-mono"
                disabled={!fbPixelSettings.enabled}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Generate in Events Manager &gt; Settings &gt; Conversions API
              </p>
            </div>
          )}

          {fbPixelSettings.enableConversionsApi && (
            <div>
              <Label htmlFor="testEventCode">Test Event Code (Optional)</Label>
              <Input
                id="testEventCode"
                placeholder="TEST12345"
                value={fbPixelSettings.testEventCode}
                onChange={(e) => setFbPixelSettings({ ...fbPixelSettings, testEventCode: e.target.value })}
                className="border-border mt-1 font-mono"
                disabled={!fbPixelSettings.enabled}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use for testing events without affecting live data
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="fbDebugMode" className="font-medium">Debug Mode</Label>
              <p className="text-sm text-muted-foreground">
                Log events to browser console for testing
              </p>
            </div>
            <Switch
              id="fbDebugMode"
              checked={fbPixelSettings.debugMode}
              onCheckedChange={(checked) => setFbPixelSettings({ ...fbPixelSettings, debugMode: checked })}
              disabled={!fbPixelSettings.enabled}
            />
          </div>

          {fbPixelSettings.enabled && (
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-medium text-sm mb-2">Tracked Events</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>ViewContent - Product page views</li>
                <li>AddToCart - Add to cart actions</li>
                <li>InitiateCheckout - Checkout started</li>
                <li>AddPaymentInfo - Payment info added</li>
                <li>Purchase - Completed purchases</li>
                <li>Search - Product searches</li>
              </ul>
              {fbPixelSettings.enableConversionsApi && (
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                  Server-side events are sent via Conversions API for improved attribution.
                </p>
              )}
            </div>
          )}

          <Button
            onClick={handleSaveFBPixel}
            disabled={updateMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {updateMutation.isPending ? "Saving..." : "Save Pixel Settings"}
          </Button>
        </div>
      </Card>

      {/* Component Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Component Settings</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Enable or disable shop components. Changes will apply to the storefront.
        </p>
        {registeredComponents.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {registeredComponents.map((component) => {
                const state = componentConfig.components[component.id]
                const isEnabled = state?.enabled ?? component.defaultEnabled
                return (
                  <div
                    key={component.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{component.name}</div>
                      {component.description && (
                        <div className="text-sm text-muted-foreground">{component.description}</div>
                      )}
                      {component.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                          {component.category}
                        </span>
                      )}
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleComponent(component.id, checked)}
                    />
                  </div>
                )
              })}
            </div>
            <Button
              onClick={handleSaveComponents}
              disabled={updateRegistryMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {updateRegistryMutation.isPending ? "Saving..." : "Save Component Settings"}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No components have been registered yet. Components will appear here when they are added to the registry.
          </p>
        )}
      </Card>

      {/* Client Theme (Multi-tenant) */}
      <ClientThemeEditor />
    </div>
  )
}
