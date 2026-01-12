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
