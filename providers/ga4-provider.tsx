"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import Script from "next/script"
import { useSettings } from "@/lib/api-hooks"

// GA4 Settings interface
export interface GA4Settings {
  enabled: boolean
  measurementId: string
  enhancedConversions: boolean
  debugMode: boolean
}

// Context for GA4 settings
interface GA4ContextValue {
  settings: GA4Settings | null
  isLoaded: boolean
}

const GA4Context = createContext<GA4ContextValue>({
  settings: null,
  isLoaded: false,
})

export function useGA4Context() {
  return useContext(GA4Context)
}

interface GA4ProviderProps {
  children: ReactNode
}

export function GA4Provider({ children }: GA4ProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const { data: settingsData } = useSettings()

  // Extract GA4 settings from shop settings
  const ga4Settings: GA4Settings | null = settingsData?.settings?.ga4 as GA4Settings | null

  // Validate measurement ID format (G-XXXXXXXXXX)
  const isValidMeasurementId = ga4Settings?.measurementId &&
    /^G-[A-Z0-9]{10}$/.test(ga4Settings.measurementId)

  const shouldLoadGA4 = ga4Settings?.enabled && isValidMeasurementId

  // Handle script load
  const handleScriptLoad = () => {
    setIsLoaded(true)

    // Initialize gtag if not already done
    if (typeof window !== "undefined" && !window.dataLayer) {
      window.dataLayer = []
    }

    // Configure GA4
    if (ga4Settings?.measurementId) {
      window.gtag("js", new Date())
      window.gtag("config", ga4Settings.measurementId, {
        // Enable enhanced conversions if configured
        allow_enhanced_conversions: ga4Settings.enhancedConversions,
        // Enable debug mode if configured (only in development or when explicitly enabled)
        debug_mode: ga4Settings.debugMode,
        // Send page views automatically
        send_page_view: true,
      })
    }
  }

  // Effect to initialize dataLayer
  useEffect(() => {
    if (typeof window !== "undefined" && shouldLoadGA4) {
      // Initialize dataLayer if not already done
      window.dataLayer = window.dataLayer || []

      // Define gtag function
      function gtag(...args: unknown[]) {
        window.dataLayer.push(args)
      }

      // Assign to window
      window.gtag = gtag as typeof window.gtag
    }
  }, [shouldLoadGA4])

  return (
    <GA4Context.Provider value={{ settings: ga4Settings, isLoaded }}>
      {/* Load Google Analytics script only if enabled and has valid measurement ID */}
      {shouldLoadGA4 && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Settings.measurementId}`}
            strategy="afterInteractive"
            onLoad={handleScriptLoad}
          />
          <Script id="ga4-config" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4Settings.measurementId}', {
                allow_enhanced_conversions: ${ga4Settings.enhancedConversions},
                debug_mode: ${ga4Settings.debugMode},
                send_page_view: true
              });
            `}
          </Script>
        </>
      )}
      {children}
    </GA4Context.Provider>
  )
}

/**
 * Hook to check if GA4 is enabled and loaded
 */
export function useGA4() {
  const { settings, isLoaded } = useGA4Context()

  return {
    isEnabled: settings?.enabled ?? false,
    isLoaded,
    measurementId: settings?.measurementId,
    enhancedConversions: settings?.enhancedConversions ?? false,
  }
}
