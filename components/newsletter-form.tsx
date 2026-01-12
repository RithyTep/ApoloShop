"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail, CheckCircle, Loader2 } from "lucide-react"
import { translations, type Language } from "@/lib/i18n"

interface NewsletterFormProps {
  language?: "EN" | "KH"
  variant?: "inline" | "stacked"
  showName?: boolean
  source?: string
  className?: string
}

export function NewsletterForm({
  language = "EN",
  variant = "inline",
  showName = false,
  source = "footer",
  className = "",
}: NewsletterFormProps) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const lang = language === "EN" ? "en" : "kh"
  const t = translations[lang].newsletter

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) return

    setStatus("loading")
    setErrorMessage("")

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: showName ? name : undefined,
          source,
          language: lang,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Subscription failed")
      }

      setStatus("success")
      setEmail("")
      setName("")
    } catch (error) {
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong")
    }
  }

  if (status === "success") {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <CheckCircle className="h-5 w-5" />
        <span>{t.success}</span>
      </div>
    )
  }

  const isStacked = variant === "stacked"

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className={isStacked ? "space-y-3" : "flex gap-2"}>
        {showName && (
          <Input
            type="text"
            placeholder={t.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={isStacked ? "w-full" : "flex-1"}
          />
        )}
        <div className={isStacked ? "w-full" : "flex-1"}>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder={t.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-9"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={status === "loading"}
          className={isStacked ? "w-full" : ""}
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t.subscribe
          )}
        </Button>
      </div>
      {status === "error" && (
        <p className="text-sm text-destructive mt-2">{errorMessage}</p>
      )}
    </form>
  )
}

// Footer section with newsletter
export function NewsletterSection({
  language = "EN",
  className = "",
}: {
  language?: "EN" | "KH"
  className?: string
}) {
  const lang = language === "EN" ? "en" : "kh"
  const t = translations[lang].newsletter

  return (
    <div className={`bg-muted/50 p-6 rounded-lg ${className}`}>
      <h3 className="font-semibold text-lg mb-2">{t.title}</h3>
      <p className="text-muted-foreground text-sm mb-4">{t.description}</p>
      <NewsletterForm language={language} source="footer" />
    </div>
  )
}
