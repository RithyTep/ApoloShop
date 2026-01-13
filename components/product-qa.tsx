"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  HelpCircle,
  Send,
  User,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import {
  useProductQuestions,
  useCreateQuestion,
  useCreateAnswer,
  useVoteAnswer,
  ProductQuestion as QuestionType,
  ProductAnswer as AnswerType,
} from "@/lib/api-hooks"
import { translations } from "@/lib/i18n"

interface ProductQAProps {
  productId: string
  language: "EN" | "KH"
}

export function ProductQA({ productId, language }: ProductQAProps) {
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [question, setQuestion] = useState("")
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [offset, setOffset] = useState(0)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())
  const limit = 5

  const t = translations[language === "EN" ? "en" : "kh"]
  const { data, isLoading, error, refetch } = useProductQuestions(productId, { limit, offset })
  const createQuestion = useCreateQuestion()

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    try {
      await createQuestion.mutateAsync({
        productId,
        question: question.trim(),
        guestName: guestName.trim() || undefined,
        guestEmail: guestEmail.trim() || undefined,
      })
      setQuestion("")
      setGuestName("")
      setGuestEmail("")
      setShowQuestionForm(false)
      refetch()
    } catch {
      // Error handled by mutation
    }
  }

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId)
    } else {
      newExpanded.add(questionId)
    }
    setExpandedQuestions(newExpanded)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === "EN" ? "en-US" : "km-KH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (isLoading) {
    return (
      <section className="mt-12">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="h-6 w-6" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return null
  }

  const questions = data?.questions || []
  const pagination = data?.pagination

  return (
    <section className="mt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">
            {t.qa?.title || "Questions & Answers"}
          </h2>
          {pagination && pagination.total > 0 && (
            <Badge variant="secondary" className="ml-2">
              {pagination.total}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowQuestionForm(!showQuestionForm)}
        >
          {showQuestionForm
            ? (t.qa?.cancel || "Cancel")
            : (t.qa?.askQuestion || "Ask a Question")}
        </Button>
      </div>

      {/* Ask Question Form */}
      {showQuestionForm && (
        <Card className="p-6 mb-6">
          <form onSubmit={handleSubmitQuestion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t.qa?.yourQuestion || "Your Question"} *
              </label>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t.qa?.questionPlaceholder || "What would you like to know about this product?"}
                rows={3}
                minLength={10}
                maxLength={1000}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                {question.length}/1000 ({t.qa?.minChars || "min 10 characters"})
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t.qa?.yourName || "Your Name"}
                </label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t.qa?.namePlaceholder || "Enter your name (optional)"}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t.qa?.yourEmail || "Email (for notifications)"}
                </label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder={t.qa?.emailPlaceholder || "Enter email to get notified"}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={question.length < 10 || createQuestion.isPending}
              className="w-full sm:w-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              {createQuestion.isPending
                ? (t.qa?.submitting || "Submitting...")
                : (t.qa?.submit || "Submit Question")}
            </Button>

            {createQuestion.isSuccess && (
              <p className="text-sm text-green-600">
                {t.qa?.thankYou || "Thank you! Your question will be visible after moderation."}
              </p>
            )}

            {createQuestion.isError && (
              <p className="text-sm text-destructive">
                {t.qa?.error || "Failed to submit question. Please try again."}
              </p>
            )}
          </form>
        </Card>
      )}

      {/* Questions List */}
      {questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((q) => (
            <QuestionItem
              key={q.id}
              question={q}
              language={language}
              isExpanded={expandedQuestions.has(q.id)}
              onToggle={() => toggleQuestion(q.id)}
              formatDate={formatDate}
            />
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
                {t.qa?.previous || "Previous"}
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
                {t.qa?.next || "Next"}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t.qa?.noQuestions || "No Questions Yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t.qa?.beFirst || "Be the first to ask a question about this product!"}
          </p>
          {!showQuestionForm && (
            <Button onClick={() => setShowQuestionForm(true)}>
              {t.qa?.askQuestion || "Ask a Question"}
            </Button>
          )}
        </Card>
      )}
    </section>
  )
}

// Individual Question Component
interface QuestionItemProps {
  question: QuestionType
  language: "EN" | "KH"
  isExpanded: boolean
  onToggle: () => void
  formatDate: (dateStr: string) => string
}

function QuestionItem({ question, language, isExpanded, onToggle, formatDate }: QuestionItemProps) {
  const [showAnswerForm, setShowAnswerForm] = useState(false)
  const [answerText, setAnswerText] = useState("")
  const [answerName, setAnswerName] = useState("")

  const t = translations[language === "EN" ? "en" : "kh"]
  const createAnswer = useCreateAnswer()

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answerText.trim()) return

    try {
      await createAnswer.mutateAsync({
        questionId: question.id,
        answer: answerText.trim(),
        guestName: answerName.trim() || undefined,
      })
      setAnswerText("")
      setAnswerName("")
      setShowAnswerForm(false)
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <Card className="p-4">
      {/* Question */}
      <button
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-sm">Q</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-medium">{question.question}</p>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{question.askerName}</span>
              <span>•</span>
              <span>{formatDate(question.createdAt)}</span>
              {question.answerCount > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {question.answerCount} {question.answerCount === 1 ? (t.qa?.answer || "answer") : (t.qa?.answers || "answers")}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Answers (when expanded) */}
      {isExpanded && (
        <div className="mt-4 pl-11 space-y-4">
          {question.answers.length > 0 ? (
            question.answers.map((answer) => (
              <AnswerItem
                key={answer.id}
                answer={answer}
                language={language}
                formatDate={formatDate}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {t.qa?.noAnswersYet || "No answers yet. Be the first to answer!"}
            </p>
          )}

          {/* Answer Form */}
          {showAnswerForm ? (
            <form onSubmit={handleSubmitAnswer} className="space-y-3 pt-2 border-t border-border">
              <Textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder={t.qa?.answerPlaceholder || "Share your knowledge..."}
                rows={2}
                minLength={5}
                maxLength={2000}
                required
              />
              <div className="flex items-center gap-2">
                <Input
                  value={answerName}
                  onChange={(e) => setAnswerName(e.target.value)}
                  placeholder={t.qa?.namePlaceholder || "Your name (optional)"}
                  className="flex-1"
                  maxLength={100}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={answerText.length < 5 || createAnswer.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAnswerForm(false)}
                >
                  {t.qa?.cancel || "Cancel"}
                </Button>
              </div>
              {createAnswer.isError && (
                <p className="text-sm text-destructive">
                  {t.qa?.answerError || "Failed to submit answer."}
                </p>
              )}
            </form>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAnswerForm(true)}
              className="text-primary"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              {t.qa?.addAnswer || "Add an Answer"}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

// Individual Answer Component
interface AnswerItemProps {
  answer: AnswerType
  language: "EN" | "KH"
  formatDate: (dateStr: string) => string
}

function AnswerItem({ answer, language, formatDate }: AnswerItemProps) {
  const t = translations[language === "EN" ? "en" : "kh"]
  const voteAnswer = useVoteAnswer()
  const [localVotes, setLocalVotes] = useState({
    helpful: answer.helpfulVotes,
    unhelpful: answer.unhelpfulVotes,
  })

  const handleVote = async (isHelpful: boolean) => {
    try {
      const result = await voteAnswer.mutateAsync({
        answerId: answer.id,
        isHelpful,
      })
      setLocalVotes({
        helpful: result.helpfulVotes,
        unhelpful: result.unhelpfulVotes,
      })
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-1">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
          answer.isOfficial ? "bg-green-100 dark:bg-green-900" : "bg-muted"
        }`}>
          {answer.isOfficial ? (
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <span className="text-muted-foreground font-semibold text-sm">A</span>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground text-sm">
            {answer.responderName}
          </span>
          {answer.isOfficial && (
            <Badge variant="default" className="text-xs bg-green-600">
              {t.qa?.official || "Official"}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDate(answer.createdAt)}
          </span>
        </div>
        <p className="text-foreground text-sm whitespace-pre-wrap">{answer.answer}</p>

        {/* Voting */}
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => handleVote(true)}
            disabled={voteAnswer.isPending}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-green-600 transition-colors"
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{localVotes.helpful}</span>
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={voteAnswer.isPending}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-red-600 transition-colors"
          >
            <ThumbsDown className="h-4 w-4" />
            <span>{localVotes.unhelpful}</span>
          </button>
          <span className="text-xs text-muted-foreground">
            {t.qa?.helpful || "Helpful?"}
          </span>
        </div>
      </div>
    </div>
  )
}
