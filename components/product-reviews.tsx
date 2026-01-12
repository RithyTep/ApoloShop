"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { MessageSquare, Send, User } from "lucide-react"
import { useProductReviews, useCreateReview } from "@/lib/api-hooks"
import { StarRating, InteractiveStarRating } from "@/components/star-rating"
import { translations } from "@/lib/i18n"

interface ProductReviewsProps {
  productId: string
  language: "EN" | "KH"
}

export function ProductReviews({ productId, language }: ProductReviewsProps) {
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [guestName, setGuestName] = useState("")
  const [offset, setOffset] = useState(0)
  const limit = 5

  const t = translations[language === "EN" ? "en" : "kh"]
  const { data, isLoading, error, refetch } = useProductReviews(productId, { limit, offset })
  const createReview = useCreateReview()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return

    try {
      await createReview.mutateAsync({
        productId,
        rating,
        comment: comment.trim() || undefined,
        guestName: guestName.trim() || undefined,
      })
      setRating(0)
      setComment("")
      setGuestName("")
      setShowForm(false)
      refetch()
    } catch {
      // Error handled by mutation
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === "EN" ? "en-US" : "km-KH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (isLoading) {
    return (
      <section className="mt-12">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="h-6 w-6" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return null
  }

  const stats = data?.stats
  const reviews = data?.reviews || []
  const pagination = data?.pagination

  return (
    <section className="mt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">
            {t.reviews?.title || "Customer Reviews"}
          </h2>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm
            ? (t.reviews?.cancel || "Cancel")
            : (t.reviews?.writeReview || "Write a Review")}
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && stats.totalReviews > 0 && (
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Average Rating */}
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-foreground">
                {stats.averageRating.toFixed(1)}
              </div>
              <div>
                <StarRating rating={stats.averageRating} size="lg" />
                <p className="text-muted-foreground mt-1">
                  {t.reviews?.basedOn || "Based on"} {stats.totalReviews}{" "}
                  {stats.totalReviews === 1
                    ? (t.reviews?.review || "review")
                    : (t.reviews?.reviews || "reviews")}
                </p>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star as keyof typeof stats.distribution] || 0
                const percentage = stats.totalReviews > 0
                  ? (count / stats.totalReviews) * 100
                  : 0

                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-8">{star}★</span>
                    <Progress value={percentage} className="flex-1 h-2" />
                    <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Write Review Form */}
      {showForm && (
        <Card className="p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t.reviews?.yourRating || "Your Rating"} *
              </label>
              <InteractiveStarRating
                value={rating}
                onChange={setRating}
                size="lg"
              />
              {rating === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t.reviews?.clickToRate || "Click to rate"}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t.reviews?.yourName || "Your Name"}
              </label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t.reviews?.namePlaceholder || "Enter your name (optional)"}
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t.reviews?.yourReview || "Your Review"}
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.reviews?.reviewPlaceholder || "Share your experience with this product (optional)"}
                rows={4}
                maxLength={2000}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {comment.length}/2000
              </p>
            </div>

            <Button
              type="submit"
              disabled={rating === 0 || createReview.isPending}
              className="w-full sm:w-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              {createReview.isPending
                ? (t.reviews?.submitting || "Submitting...")
                : (t.reviews?.submit || "Submit Review")}
            </Button>

            {createReview.isSuccess && (
              <p className="text-sm text-green-600">
                {t.reviews?.thankYou || "Thank you! Your review will be visible after moderation."}
              </p>
            )}

            {createReview.isError && (
              <p className="text-sm text-destructive">
                {t.reviews?.error || "Failed to submit review. Please try again."}
              </p>
            )}
          </form>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {review.reviewerName}
                    </span>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(review.createdAt)}
                  </p>
                  {review.comment && (
                    <p className="text-foreground mt-3 whitespace-pre-wrap">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {pagination && pagination.total > limit && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
              >
                {t.reviews?.previous || "Previous"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {Math.floor(offset / limit) + 1} / {Math.ceil(pagination.total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + limit)}
                disabled={!pagination.hasMore}
              >
                {t.reviews?.next || "Next"}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t.reviews?.noReviews || "No Reviews Yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t.reviews?.beFirst || "Be the first to review this product!"}
          </p>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              {t.reviews?.writeReview || "Write a Review"}
            </Button>
          )}
        </Card>
      )}
    </section>
  )
}
