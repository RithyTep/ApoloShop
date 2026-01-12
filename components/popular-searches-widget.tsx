"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSearchAnalytics, PopularSearch } from "@/lib/api-hooks"
import { Search, TrendingUp, AlertCircle } from "lucide-react"

interface PopularSearchesWidgetProps {
  limit?: number
}

export function PopularSearchesWidget({ limit = 10 }: PopularSearchesWidgetProps) {
  const { data, isLoading, error } = useSearchAnalytics({ limit })

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">Popular Searches</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">Popular Searches</h2>
        </div>
        <p className="text-sm text-muted-foreground">Failed to load search data</p>
      </Card>
    )
  }

  const popularSearches = data?.popularSearches || []
  const summary = data?.summary
  const zeroResultQueries = data?.zeroResultQueries || []

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-bold text-foreground">Popular Searches</h2>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b border-border">
          <div>
            <p className="text-2xl font-bold text-foreground">{summary.totalSearches}</p>
            <p className="text-xs text-muted-foreground">Total Searches</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{summary.successRate}%</p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{summary.zeroResultSearches}</p>
            <p className="text-xs text-muted-foreground">Zero Results</p>
          </div>
        </div>
      )}

      {/* Popular searches list */}
      {popularSearches.length > 0 ? (
        <div className="space-y-3">
          {popularSearches.slice(0, limit).map((search: PopularSearch, index: number) => (
            <div
              key={search.query}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground w-5">
                  {index + 1}.
                </span>
                <span className="text-sm text-foreground">{search.query}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {search.avgResults} avg results
                </span>
                <span className="text-sm font-medium text-foreground px-2 py-0.5 bg-muted rounded">
                  {search.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No search data yet</p>
        </div>
      )}

      {/* Zero result searches warning */}
      {zeroResultQueries.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-medium text-foreground">Searches with No Results</h3>
          </div>
          <div className="space-y-2">
            {zeroResultQueries.slice(0, 5).map((item) => (
              <div
                key={item.query}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{item.query}</span>
                <span className="text-xs text-warning">{item.count}x</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Consider adding products matching these searches
          </p>
        </div>
      )}
    </Card>
  )
}
