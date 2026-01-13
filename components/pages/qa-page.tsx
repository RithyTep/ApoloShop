"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Check, X, Trash, HelpCircle, MessageCircle, AlertCircle, Send } from "lucide-react"
import { useAdminQuestions, useUpdateQuestionStatus, useDeleteQuestion, useCreateAnswer, ProductQuestion } from "@/lib/api-hooks"
import { useToast } from "@/components/ui/use-toast"

type QuestionStatus = "PENDING" | "APPROVED" | "REJECTED"

const statusFilters: { value: QuestionStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Questions" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
]

export function QAPage() {
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | "ALL">("ALL")
  const [deleteQuestion, setDeleteQuestion] = useState<ProductQuestion | null>(null)
  const [answerQuestion, setAnswerQuestion] = useState<ProductQuestion | null>(null)
  const [answerText, setAnswerText] = useState("")
  const [offset, setOffset] = useState(0)
  const limit = 20

  const { data, isLoading, refetch } = useAdminQuestions({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    limit,
    offset,
  })
  const updateStatusMutation = useUpdateQuestionStatus()
  const deleteMutation = useDeleteQuestion()
  const createAnswerMutation = useCreateAnswer()

  const questions = data?.questions || []
  const statusCounts = data?.statusCounts || { PENDING: 0, APPROVED: 0, REJECTED: 0 }
  const pagination = data?.pagination

  const handleStatusChange = async (questionId: string, status: QuestionStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ questionId, status })
      toast({
        title: "Question updated",
        description: `Question has been ${status.toLowerCase()}`,
      })
      refetch()
    } catch {
      toast({
        title: "Error",
        description: "Failed to update question status",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteQuestion) return
    try {
      await deleteMutation.mutateAsync(deleteQuestion.id)
      toast({
        title: "Question deleted",
        description: "The question has been permanently deleted",
      })
      setDeleteQuestion(null)
      refetch()
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      })
    }
  }

  const handleSubmitAnswer = async () => {
    if (!answerQuestion || !answerText.trim()) return
    try {
      await createAnswerMutation.mutateAsync({
        questionId: answerQuestion.id,
        answer: answerText.trim(),
        isOfficial: true,
      })
      toast({
        title: "Answer submitted",
        description: "Your official answer has been posted",
      })
      setAnswerQuestion(null)
      setAnswerText("")
      refetch()
    } catch {
      toast({
        title: "Error",
        description: "Failed to submit answer",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: QuestionStatus) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>
      case "APPROVED":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Approved</Badge>
      case "REJECTED":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejected</Badge>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Q&A Management</h1>
          {statusCounts.PENDING > 0 && (
            <Badge variant="destructive" className="ml-2">
              {statusCounts.PENDING} Pending
            </Badge>
          )}
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as QuestionStatus | "ALL")
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{statusCounts.PENDING}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{statusCounts.APPROVED}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <X className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold">{statusCounts.REJECTED}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HelpCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{pagination?.total || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Questions Table */}
      <Card>
        {questions.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Questions Found</h3>
            <p className="text-muted-foreground">
              {statusFilter === "ALL"
                ? "No questions have been submitted yet."
                : `No ${statusFilter.toLowerCase()} questions found.`}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Asked By</TableHead>
                <TableHead>Answers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell>
                    {question.product ? (
                      <div className="flex items-center gap-3">
                        {question.product.imageUrl && (
                          <img
                            src={question.product.imageUrl}
                            alt={question.product.nameEn}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-foreground text-sm">{question.product.nameEn}</p>
                          <p className="text-xs text-muted-foreground">{question.product.nameKh}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Product deleted</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-foreground line-clamp-2">{question.question}</p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{question.askerName}</p>
                      {question.askerEmail && (
                        <p className="text-xs text-muted-foreground">{question.askerEmail}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{question.answerCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(question.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(question.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {question.status === "APPROVED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAnswerQuestion(question)}
                          title="Answer"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {question.status !== "APPROVED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(question.id, "APPROVED")}
                          title="Approve"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {question.status !== "REJECTED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(question.id, "REJECTED")}
                          title="Reject"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteQuestion(question)}
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
      <AlertDialog open={!!deleteQuestion} onOpenChange={() => setDeleteQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This will also delete all answers. This action cannot be undone.
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

      {/* Answer Dialog */}
      <Dialog open={!!answerQuestion} onOpenChange={() => {
        setAnswerQuestion(null)
        setAnswerText("")
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Submit Official Answer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Question Preview */}
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-1">Question:</p>
              <p className="text-foreground">{answerQuestion?.question}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Asked by {answerQuestion?.askerName} • {answerQuestion?.product?.nameEn}
              </p>
            </div>

            {/* Answer Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Your Answer
              </label>
              <Textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Provide a helpful answer to this question..."
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {answerText.length}/2000 characters
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAnswerQuestion(null)
                  setAnswerText("")
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAnswer}
                disabled={answerText.length < 5 || createAnswerMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {createAnswerMutation.isPending ? "Submitting..." : "Submit Answer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
