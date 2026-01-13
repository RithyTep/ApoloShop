import { Metadata } from "next"
import { ComparePageClient } from "./compare-page-client"

export const metadata: Metadata = {
  title: "Compare Products",
  description: "Compare products side by side to make an informed decision.",
}

interface ComparePageProps {
  searchParams: Promise<{ ids?: string }>
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams
  const productIds = params.ids?.split(",").filter(Boolean) || []

  return <ComparePageClient initialProductIds={productIds} />
}
