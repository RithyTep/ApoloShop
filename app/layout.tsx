import type React from "react"
import type { Metadata } from "next"
import { Figtree } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/providers/query-provider"
import { CartProvider } from "@/providers/cart-provider"
import { I18nProvider } from "@/providers/i18n-provider"
import { GA4Provider } from "@/providers/ga4-provider"
import { FBPixelProvider } from "@/providers/fb-pixel-provider"
import { Toaster } from "@/components/ui/toaster"

const fontSans = Figtree({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "ApoloShop - Shop CMS",
  description: "Professional admin dashboard for managing Cambodian small business eCommerce",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={fontSans.variable}>
      <body className="antialiased">
        <QueryProvider>
          <GA4Provider>
            <FBPixelProvider>
              <I18nProvider>
                <CartProvider>
                  {children}
                  <Toaster />
                </CartProvider>
              </I18nProvider>
            </FBPixelProvider>
          </GA4Provider>
        </QueryProvider>
      </body>
    </html>
  )
}
