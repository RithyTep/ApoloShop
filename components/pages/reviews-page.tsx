"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Check, X, Trash, MessageSquare, Star, AlertCircle } from "lucide-react"
import { useAdminReviews, useUpdateReviewStatus, useDeleteReview, ReviewStatus, Review } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"
import { StarRating } from "@/components/star-rating"

const statusFilters: { value: ReviewStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Reviews" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
]

export function ReviewsPage() {
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "ALL">("ALL")
  const [deleteReview, setDeleteReview] = useState<Review | null>(null)
  const [offset, setOffset] = useState(0)
  const limit = 20

  const { data, isLoading, refetch } = useAdminReviews({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    limit,
    offset,
  })
  const updateStatusMutation = useUpdateReviewStatus()
  const deleteMutation = useDeleteReview()

  const reviews = data?.reviews || []
  const pendingCount = data?.pendingCount || 0
  const pagination = data?.pagination

  const handleStatusChange = async (reviewId: string, status: ReviewStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ reviewId, status })
      toast({
        title: "Review updated",
        description: `Review has been ${status.toLowerCase()}`,
      })
      refetch()
    } catch {
      toast({
        title: "Error",
        description: "Failed to update review status",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteReview) return
    try {
      await deleteMutation.mutateAsync(deleteReview.id)
      toast({
        title: "Review deleted",
        description: "The review has been permanently deleted",
      })
      setDeleteReview(null)
      refetch()
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>
      case "APPROVED":
        return <Badge variant="success">Approved</Badge>
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MessageSquare className="h-7 w-7" />
            Reviews Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and moderate customer product reviews
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingCount} Pending
              </Badge>
            )}
          </p>
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as ReviewStatus | "ALL")
            setOffset(0)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusFilters.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Check className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
              <p className="text-2xl font-bold">{pagination?.total || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <Star className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current View</p>
              <p className="text-2xl font-bold">{reviews.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Reviews Table */}
      <Card className="p-6">
        {reviews.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Reviews Found</h3>
            <p className="text-muted-foreground">
              {statusFilter === "ALL"
                ? "No reviews have been submitted yet."
                : `No ${statusFilter.toLowerCase()} reviews found.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    {review.product ? (
                      <div className="flex items-center gap-3">
                        {review.product.imageUrl && (
                          <img
                            src={review.product.imageUrl}
                            alt={review.product.nameEn}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-foreground">{review.product.nameEn}</p>
                          <p className="text-sm text-muted-foreground">{review.product.nameKh}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Product deleted</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{review.reviewerName}</p>
                      {review.reviewerEmail && (
                        <p className="text-sm text-muted-foreground">{review.reviewerEmail}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StarRating rating={review.rating} size="sm" />
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {review.comment ? (
                      <p className="text-sm text-foreground line-clamp-2">{review.comment}</p>
                    ) : (
                      <span className="text-muted-foreground italic">No comment</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(review.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {review.status !== "APPROVED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(review.id, "APPROVED")}
                          title="Approve"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {review.status !== "REJECTED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(review.id, "REJECTED")}
                          title="Reject"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteReview(review)}
                        title="Delete"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total > limit && (
          <div className="flex items-center justify-center gap-2 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {Math.floor(offset / limit) + 1} of {Math.ceil(pagination.total / limit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + limit)}
              disabled={!pagination.hasMore}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteReview} onOpenChange={() => setDeleteReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
