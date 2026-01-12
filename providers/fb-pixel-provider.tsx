"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import Script from "next/script"
import { useSettings } from "@/lib/api-hooks"

// Facebook Pixel Settings interface
export interface FBPixelSettings {
  enabled: boolean
  pixelId: string
  enableConversionsApi: boolean
  accessToken: string
  testEventCode: string
  debugMode: boolean
}

// Context for Facebook Pixel settings
interface FBPixelContextValue {
  settings: FBPixelSettings | null
  isLoaded: boolean
}

const FBPixelContext = createContext<FBPixelContextValue>({
  settings: null,
  isLoaded: false,
})

export function useFBPixelContext() {
  return useContext(FBPixelContext)
}

interface FBPixelProviderProps {
  children: ReactNode
}

export function FBPixelProvider({ children }: FBPixelProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const { data: settingsData } = useSettings()

  // Extract FB Pixel settings from shop settings
  const fbPixelSettings: FBPixelSettings | null = settingsData?.settings?.fbPixel as FBPixelSettings | null

  // Validate pixel ID format (numeric, typically 15-16 digits)
  const isValidPixelId = fbPixelSettings?.pixelId &&
    /^\d{15,16}$/.test(fbPixelSettings.pixelId)

  const shouldLoadPixel = fbPixelSettings?.enabled && isValidPixelId

  // Handle script load
  const handleScriptLoad = () => {
    setIsLoaded(true)

    // Initialize Facebook Pixel
    if (typeof window !== "undefined" && fbPixelSettings?.pixelId) {
      // Pixel initialization is done via inline script for reliability
      // This handler just confirms the script loaded successfully
      if (fbPixelSettings.debugMode) {
        console.log("[FB Pixel] Loaded successfully with ID:", fbPixelSettings.pixelId)
      }
    }
  }

  // Effect to initialize fbq function
  useEffect(() => {
    if (typeof window !== "undefined" && shouldLoadPixel) {
      // Initialize fbq if not already done
      if (!window.fbq) {
        const n: typeof window.fbq = function(...args) {
          if (n.callMethod) {
            n.callMethod(...args)
          } else {
            n.queue.push(args)
          }
        } as typeof window.fbq & {
          callMethod?: (...args: unknown[]) => void
          queue: unknown[][]
          loaded: boolean
          version: string
        }

        if (!window._fbq) window._fbq = n
        n.push = n
        n.loaded = true
        n.version = "2.0"
        n.queue = []
        window.fbq = n
      }
    }
  }, [shouldLoadPixel])

  return (
    <FBPixelContext.Provider value={{ settings: fbPixelSettings, isLoaded }}>
      {/* Load Facebook Pixel script only if enabled and has valid pixel ID */}
      {shouldLoadPixel && (
        <>
          {/* Initialize Pixel before loading script */}
          <Script id="fb-pixel-init" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${fbPixelSettings.pixelId}');
              fbq('track', 'PageView');
              ${fbPixelSettings.debugMode ? "console.log('[FB Pixel] Initialized with ID:', '" + fbPixelSettings.pixelId + "');" : ""}
            `}
          </Script>
          {/* NoScript fallback for users with JS disabled */}
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${fbPixelSettings.pixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
          {/* Alternative script load detection */}
          <Script
            src="https://connect.facebook.net/en_US/fbevents.js"
            strategy="afterInteractive"
            onLoad={handleScriptLoad}
          />
        </>
      )}
      {children}
    </FBPixelContext.Provider>
  )
}

/**
 * Hook to check if Facebook Pixel is enabled and loaded
 */
export function useFBPixel() {
  const { settings, isLoaded } = useFBPixelContext()

  return {
    isEnabled: settings?.enabled ?? false,
    isLoaded,
    pixelId: settings?.pixelId,
    enableConversionsApi: settings?.enableConversionsApi ?? false,
    debugMode: settings?.debugMode ?? false,
  }
}
