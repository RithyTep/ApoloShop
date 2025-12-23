"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminDashboard } from "@/components/admin-dashboard"
import { useSession } from "@/lib/api-hooks"

export default function AdminPage() {
  const router = useRouter()
  const { data: session, isLoading, isError } = useSession()

  useEffect(() => {
    if (!isLoading && (!session?.authenticated || isError)) {
      router.push("/admin/login")
    }
  }, [session, isLoading, isError, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session?.authenticated) {
    return null
  }

  return <AdminDashboard />
}
