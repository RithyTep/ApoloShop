"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Check, X, Trash } from "lucide-react"
import {
  AdminPageHeader,
  AdminFilterCard,
  AdminDataCard,
  AdminTable,
  AdminTableHeader,
  AdminTableHeadRow,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminActionButtons,
  AdminActionButton,
  AdminDeleteButton,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin"
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
        return <AdminBadge variant="outline">Pending</AdminBadge>
      case "APPROVED":
        return <AdminBadge variant="default">Approved</AdminBadge>
      case "REJECTED":
        return <AdminBadge variant="destructive">Rejected</AdminBadge>
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
      <AdminLoading
        title="Reviews"
        subtitle="Manage and moderate customer product reviews"
        rows={5}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Reviews"
        subtitle="Manage and moderate customer product reviews"
      />

      <AdminFilterCard>
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
        <div className="text-sm text-muted-foreground">
          {pagination?.total || 0} reviews
          {pendingCount > 0 && ` (${pendingCount} pending)`}
        </div>
      </AdminFilterCard>

      <AdminDataCard>
        {reviews.length === 0 ? (
          <AdminEmptyState
            message={statusFilter === "ALL"
              ? "No reviews have been submitted yet."
              : `No ${statusFilter.toLowerCase()} reviews found.`}
          />
        ) : (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableHeadRow>
                <AdminTableHead>Product</AdminTableHead>
                <AdminTableHead>Reviewer</AdminTableHead>
                <AdminTableHead>Rating</AdminTableHead>
                <AdminTableHead>Comment</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Date</AdminTableHead>
                <AdminTableHead>Actions</AdminTableHead>
              </AdminTableHeadRow>
            </AdminTableHeader>
            <AdminTableBody>
              {reviews.map((review) => (
                <AdminTableRow key={review.id}>
                  <AdminTableCell>
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
                          <p className="font-medium">{review.product.nameEn}</p>
                          <p className="text-sm text-muted-foreground">{review.product.nameKh}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Product deleted</span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell>
                    <div>
                      <p className="font-medium">{review.reviewerName}</p>
                      {review.reviewerEmail && (
                        <p className="text-sm text-muted-foreground">{review.reviewerEmail}</p>
                      )}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <StarRating rating={review.rating} size="sm" />
                  </AdminTableCell>
                  <AdminTableCell className="max-w-xs">
                    {review.comment ? (
                      <p className="text-sm line-clamp-2">{review.comment}</p>
                    ) : (
                      <span className="text-muted-foreground italic">No comment</span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell>{getStatusBadge(review.status)}</AdminTableCell>
                  <AdminTableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminActionButtons>
                      {review.status !== "APPROVED" && (
                        <AdminActionButton
                          icon={<Check size={14} />}
                          onClick={() => handleStatusChange(review.id, "APPROVED")}
                        />
                      )}
                      {review.status !== "REJECTED" && (
                        <AdminActionButton
                          icon={<X size={14} />}
                          onClick={() => handleStatusChange(review.id, "REJECTED")}
                          variant="destructive"
                        />
                      )}
                      <AdminDeleteButton onClick={() => setDeleteReview(review)} />
                    </AdminActionButtons>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        )}

      </AdminDataCard>

      {/* Pagination */}
      {pagination && pagination.total > limit && (
        <div className="flex items-center justify-center gap-2">
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
