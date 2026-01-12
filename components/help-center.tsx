"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, ChevronRight, ArrowLeft, ThumbsUp, ThumbsDown, Eye, Star, FolderOpen } from "lucide-react"
import {
  useHelpCategories,
  useHelpArticles,
  useTrackArticleView,
  useArticleFeedback,
  HelpArticle,
  HelpCategory,
} from "@/lib/api-hooks"
import { translations } from "@/lib/i18n"

interface HelpCenterProps {
  language?: "EN" | "KH"
}

export function HelpCenter({ language = "EN" }: HelpCenterProps) {
  const t = translations[language === "EN" ? "en" : "kh"].help
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Queries
  const { data: categoriesData, isLoading: categoriesLoading } = useHelpCategories({
    activeOnly: true,
    withArticles: true,
  })
  const { data: searchResults, isLoading: searchLoading } = useHelpArticles({
    search: debouncedSearch || undefined,
    status: "PUBLISHED",
    limit: 20,
  })
  const { data: featuredData } = useHelpArticles({ featured: true, status: "PUBLISHED", limit: 5 })
  const { data: categoryArticles } = useHelpArticles({
    categoryId: selectedCategory || undefined,
    status: "PUBLISHED",
  })

  // Mutations
  const trackViewMutation = useTrackArticleView()
  const feedbackMutation = useArticleFeedback()

  const categories = categoriesData?.categories || []
  const featured = featuredData?.articles || []
  const articles = debouncedSearch ? searchResults?.articles || [] : categoryArticles?.articles || []

  // Track article view when selected
  useEffect(() => {
    if (selectedArticle) {
      trackViewMutation.mutate(selectedArticle.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArticle?.id])

  const handleFeedback = (helpful: boolean) => {
    if (selectedArticle && !feedbackSubmitted) {
      feedbackMutation.mutate({ articleId: selectedArticle.id, helpful })
      setFeedbackSubmitted(true)
    }
  }

  const getName = (item: { nameEn: string; nameKh: string }) =>
    language === "EN" ? item.nameEn : item.nameKh

  const getTitle = (article: HelpArticle) =>
    language === "EN" ? article.titleEn : article.titleKh

  const getContent = (article: HelpArticle) =>
    language === "EN" ? article.contentEn : article.contentKh

  const selectArticle = (article: HelpArticle) => {
    setSelectedArticle(article)
    setFeedbackSubmitted(false)
  }

  const goBack = () => {
    if (selectedArticle) {
      setSelectedArticle(null)
    } else if (selectedCategory) {
      setSelectedCategory(null)
    }
  }

  if (categoriesLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Article detail view
  if (selectedArticle) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={goBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          {t.backToHelp}
        </Button>

        {/* Article */}
        <Card className="p-8">
          <div className="space-y-6">
            {/* Category badge */}
            {selectedArticle.category && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderOpen size={14} />
                {getName(selectedArticle.category)}
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl font-bold text-foreground">{getTitle(selectedArticle)}</h1>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye size={14} />
                {selectedArticle.viewCount} {t.viewCount}
              </span>
              {selectedArticle.publishedAt && (
                <span>
                  {t.lastUpdated}: {new Date(selectedArticle.publishedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Content - render as HTML for basic formatting */}
            <div
              className="prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{
                __html: getContent(selectedArticle).replace(/\n/g, "<br />")
              }}
            />

            {/* Feedback section */}
            <div className="border-t pt-6 mt-8">
              <p className="text-sm font-medium mb-3">{t.wasHelpful}</p>
              {feedbackSubmitted ? (
                <p className="text-sm text-green-600">{t.thanksFeedback}</p>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback(true)}
                    disabled={feedbackMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <ThumbsUp size={14} />
                    {t.yes}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback(false)}
                    disabled={feedbackMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <ThumbsDown size={14} />
                    {t.no}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Category articles view
  if (selectedCategory) {
    const category = categories.find((c) => c.id === selectedCategory)
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={goBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          {t.backToHelp}
        </Button>

        {/* Category header */}
        {category && (
          <div>
            <h2 className="text-2xl font-bold text-foreground">{getName(category)}</h2>
            {category.description && (
              <p className="text-muted-foreground mt-2">{category.description}</p>
            )}
          </div>
        )}

        {/* Articles list */}
        <div className="space-y-3">
          {articles.map((article) => (
            <Card
              key={article.id}
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => selectArticle(article)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {article.isFeatured && (
                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  )}
                  <div>
                    <h3 className="font-medium text-foreground">{getTitle(article)}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Eye size={12} />
                      {article.viewCount} {t.viewCount}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </Card>
          ))}
          {articles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {t.noResults}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Main help center view
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{t.title}</h1>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          type="text"
          placeholder={t.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-lg"
        />
      </div>

      {/* Search results */}
      {debouncedSearch && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {searchLoading ? t.searchPlaceholder : `${articles.length} ${t.noResults.split(" ")[0]}`}
          </h2>
          {searchLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : articles.length > 0 ? (
            <div className="space-y-3">
              {articles.map((article) => (
                <Card
                  key={article.id}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => selectArticle(article)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{getTitle(article)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t.inCategory} {article.category ? getName(article.category) : "-"}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t.noResults}</p>
              <p className="text-sm text-muted-foreground mt-1">{t.noResultsDesc}</p>
            </div>
          )}
        </div>
      )}

      {/* Featured articles */}
      {!debouncedSearch && featured.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Star size={18} className="text-yellow-500" />
            {t.featuredArticles}
          </h2>
          <div className="space-y-3">
            {featured.map((article) => (
              <Card
                key={article.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => selectArticle(article)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{getTitle(article)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t.inCategory} {article.category ? getName(article.category) : "-"}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {!debouncedSearch && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t.allCategories}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="p-5 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FolderOpen size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{getName(category)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {category._count?.articles || 0} articles
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Popular articles based on views */}
      {!debouncedSearch && (
        <PopularArticles language={language} onSelect={selectArticle} />
      )}
    </div>
  )
}

// Separate component for popular articles
function PopularArticles({ language, onSelect }: { language: "EN" | "KH"; onSelect: (article: HelpArticle) => void }) {
  const t = translations[language === "EN" ? "en" : "kh"].help
  const { data } = useHelpArticles({ status: "PUBLISHED", limit: 5 })
  const articles = data?.articles?.slice().sort((a, b) => b.viewCount - a.viewCount).slice(0, 5) || []

  const getTitle = (article: HelpArticle) =>
    language === "EN" ? article.titleEn : article.titleKh

  const getName = (item: { nameEn: string; nameKh: string }) =>
    language === "EN" ? item.nameEn : item.nameKh

  if (articles.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Eye size={18} className="text-muted-foreground" />
        {t.popularArticles}
      </h2>
      <div className="space-y-3">
        {articles.map((article) => (
          <Card
            key={article.id}
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onSelect(article)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">{getTitle(article)}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>{t.inCategory} {article.category ? getName(article.category) : "-"}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    {article.viewCount}
                  </span>
                </p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
