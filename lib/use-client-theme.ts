"use client"

import { useEffect, useMemo } from "react"
import { ClientTheme } from "./api-hooks"

/**
 * CSS variable names for client theming
 */
const CSS_VARS = {
  primaryColor: "--client-primary",
  secondaryColor: "--client-secondary",
  // These are also mapped to the standard Shadcn vars for automatic integration
  primary: "--primary",
  accent: "--accent",
} as const

/**
 * Default theme values (fallback when no client theme is set)
 */
const DEFAULT_THEME: ClientTheme = {
  primaryColor: "oklch(0.72 0.16 356)", // Rose default
  secondaryColor: "oklch(0.65 0.15 250)", // Blue accent
  logoUrl: null,
  faviconUrl: null,
}

/**
 * Generate CSS variables object from client theme
 */
export function generateThemeCSSVars(theme: ClientTheme | null): Record<string, string> {
  const effectiveTheme = theme || DEFAULT_THEME

  const vars: Record<string, string> = {}

  if (effectiveTheme.primaryColor) {
    vars[CSS_VARS.primaryColor] = effectiveTheme.primaryColor
    vars[CSS_VARS.primary] = effectiveTheme.primaryColor
  }

  if (effectiveTheme.secondaryColor) {
    vars[CSS_VARS.secondaryColor] = effectiveTheme.secondaryColor
    vars[CSS_VARS.accent] = effectiveTheme.secondaryColor
  }

  return vars
}

/**
 * Apply client theme CSS variables to a DOM element
 */
export function applyThemeToElement(element: HTMLElement, theme: ClientTheme | null): void {
  const vars = generateThemeCSSVars(theme)

  Object.entries(vars).forEach(([property, value]) => {
    element.style.setProperty(property, value)
  })
}

/**
 * Remove client theme CSS variables from a DOM element
 */
export function removeThemeFromElement(element: HTMLElement): void {
  Object.values(CSS_VARS).forEach((property) => {
    element.style.removeProperty(property)
  })
}

/**
 * Hook to apply client theme CSS variables to document root
 *
 * @param theme - The client theme to apply
 * @param enabled - Whether to apply the theme (default: true)
 *
 * @example
 * ```tsx
 * function ShopLayout() {
 *   const { data } = useClientTheme()
 *   useApplyClientTheme(data?.theme)
 *   return <div>...</div>
 * }
 * ```
 */
export function useApplyClientTheme(theme: ClientTheme | null | undefined, enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return

    const root = document.documentElement

    if (theme) {
      applyThemeToElement(root, theme)
    }

    return () => {
      // Clean up on unmount or when theme changes
      removeThemeFromElement(root)
    }
  }, [theme, enabled])
}

/**
 * Hook to apply favicon from client theme
 *
 * @param faviconUrl - URL to the favicon
 * @param enabled - Whether to apply the favicon (default: true)
 */
export function useApplyClientFavicon(faviconUrl: string | null | undefined, enabled = true): void {
  useEffect(() => {
    if (!enabled || !faviconUrl || typeof document === "undefined") return

    // Find or create favicon link element
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    const originalHref = link?.href

    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }

    link.href = faviconUrl

    return () => {
      // Restore original favicon on unmount
      if (link && originalHref) {
        link.href = originalHref
      }
    }
  }, [faviconUrl, enabled])
}

/**
 * Combined hook to apply full client theme (colors + favicon)
 *
 * @param theme - The client theme to apply
 * @param enabled - Whether to apply the theme (default: true)
 *
 * @example
 * ```tsx
 * function ShopLayout() {
 *   const { data } = useClientTheme()
 *   useClientThemeStyles(data?.theme)
 *   return <div>...</div>
 * }
 * ```
 */
export function useClientThemeStyles(theme: ClientTheme | null | undefined, enabled = true): void {
  useApplyClientTheme(theme, enabled)
  useApplyClientFavicon(theme?.faviconUrl, enabled)
}

/**
 * Generate inline style object for a container element
 * Useful for preview mode where you don't want to modify document root
 *
 * @param theme - The client theme
 * @returns React CSSProperties object
 *
 * @example
 * ```tsx
 * function ThemePreview({ theme }) {
 *   const styles = useClientThemeInlineStyles(theme)
 *   return <div style={styles}>Preview content</div>
 * }
 * ```
 */
export function useClientThemeInlineStyles(
  theme: ClientTheme | null | undefined
): React.CSSProperties {
  return useMemo(() => {
    if (!theme) return {}

    const styles: Record<string, string> = {}

    if (theme.primaryColor) {
      styles["--client-primary"] = theme.primaryColor
      styles["--primary"] = theme.primaryColor
    }

    if (theme.secondaryColor) {
      styles["--client-secondary"] = theme.secondaryColor
      styles["--accent"] = theme.secondaryColor
    }

    return styles as React.CSSProperties
  }, [theme])
}

/**
 * Get merged theme with defaults filled in
 */
export function getMergedTheme(theme: ClientTheme | null | undefined): ClientTheme {
  return {
    primaryColor: theme?.primaryColor || DEFAULT_THEME.primaryColor,
    secondaryColor: theme?.secondaryColor || DEFAULT_THEME.secondaryColor,
    logoUrl: theme?.logoUrl || DEFAULT_THEME.logoUrl,
    faviconUrl: theme?.faviconUrl || DEFAULT_THEME.faviconUrl,
  }
}
