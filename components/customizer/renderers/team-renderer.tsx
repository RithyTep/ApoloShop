"use client"

import { User } from "lucide-react"
import { TeamConfig } from "@/lib/api-hooks"

interface TeamRendererProps {
  config: TeamConfig
  language: "EN" | "KH"
}

export function TeamRenderer({ config, language }: TeamRendererProps) {
  const title = language === "EN" ? config.titleEn : config.titleKh

  if (config.members.length === 0) {
    return null
  }

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">{title}</h2>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {config.members.map((member) => (
            <div key={member.id} className="text-center group">
              <div className="relative mb-4 mx-auto w-32 h-32 overflow-hidden rounded-full bg-muted">
                {member.imageUrl ? (
                  <img
                    src={member.imageUrl}
                    alt={member.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={48} className="text-muted-foreground" />
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-foreground">{member.name}</h3>
              <p className="text-sm text-muted-foreground">
                {language === "EN" ? member.roleEn : member.roleKh}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
