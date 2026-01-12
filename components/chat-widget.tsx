"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageCircle, X, Send, MinusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { translations } from "@/lib/i18n"
import {
  useAgentStatus,
  useGuestChatSession,
  useCreateChatSession,
  useSendChatMessage,
  useUpdateChatSession,
  ChatMessage,
} from "@/lib/api-hooks"

interface ChatWidgetProps {
  language: "EN" | "KH"
}

// Generate a guest ID for non-logged-in users
function getGuestId(): string {
  if (typeof window === "undefined") return ""
  let guestId = localStorage.getItem("chat_guest_id")
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem("chat_guest_id", guestId)
  }
  return guestId
}

export function ChatWidget({ language }: ChatWidgetProps) {
  const t = translations[language === "EN" ? "en" : "kh"].chat
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [message, setMessage] = useState("")
  const [guestId, setGuestId] = useState<string>("")
  const [showOfflineForm, setShowOfflineForm] = useState(false)
  const [offlineFormData, setOfflineFormData] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [offlineFormStatus, setOfflineFormStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize guest ID on client side
  useEffect(() => {
    setGuestId(getGuestId())
  }, [])

  // Check if agents are online
  const { data: agentStatusData } = useAgentStatus()
  const agentsOnline = agentStatusData?.agentsOnline ?? false

  // Get existing session for this guest
  const { data: sessionData, refetch: refetchSession } = useGuestChatSession(guestId || undefined)
  const session = sessionData?.session

  // Mutations
  const createSession = useCreateChatSession()
  const sendMessage = useSendChatMessage()
  const updateSession = useUpdateChatSession()

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (isOpen && session?.messages) {
      scrollToBottom()
    }
  }, [session?.messages, isOpen, scrollToBottom])

  // Handle starting a chat
  const handleStartChat = async () => {
    if (!guestId) return

    // If agents are offline, show offline form
    if (!agentsOnline) {
      setShowOfflineForm(true)
      return
    }

    // Create a new session if one doesn't exist
    if (!session) {
      await createSession.mutateAsync({
        guestId,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
      })
      refetchSession()
    }
  }

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!message.trim() || !session) return

    await sendMessage.mutateAsync({
      sessionId: session.id,
      sender: "CUSTOMER",
      senderId: guestId,
      content: message.trim(),
    })

    setMessage("")
  }

  // Handle offline form submission
  const handleOfflineSubmit = async () => {
    if (!offlineFormData.name || !offlineFormData.email || !offlineFormData.message) return

    setOfflineFormStatus("sending")

    try {
      // Create an offline session with the message
      await createSession.mutateAsync({
        guestId,
        customerName: offlineFormData.name,
        customerEmail: offlineFormData.email,
        initialMessage: offlineFormData.message,
        isOffline: true,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
      })

      setOfflineFormStatus("success")
      setOfflineFormData({ name: "", email: "", message: "" })
    } catch {
      setOfflineFormStatus("error")
    }
  }

  // Handle ending chat
  const handleEndChat = async () => {
    if (!session) return

    await updateSession.mutateAsync({
      sessionId: session.id,
      status: "RESOLVED",
    })

    setIsOpen(false)
    refetchSession()
  }

  // Handle keypress for sending message
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Format timestamp
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Render message
  const renderMessage = (msg: ChatMessage) => {
    const isCustomer = msg.sender === "CUSTOMER"
    const isSystem = msg.sender === "SYSTEM"

    if (isSystem) {
      return (
        <div key={msg.id} className="flex justify-center my-2">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {msg.content}
          </span>
        </div>
      )
    }

    return (
      <div key={msg.id} className={cn("flex mb-3", isCustomer ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[80%] rounded-lg px-3 py-2",
            isCustomer ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          {!isCustomer && msg.senderName && (
            <div className="text-xs font-medium mb-1">{msg.senderName}</div>
          )}
          <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
          <div
            className={cn(
              "text-[10px] mt-1",
              isCustomer ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {formatTime(msg.createdAt)}
          </div>
        </div>
      </div>
    )
  }

  // Chat bubble (minimized state)
  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true)
          setIsMinimized(false)
        }}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-3 shadow-lg hover:opacity-90 transition-opacity"
      >
        <MessageCircle size={20} />
        <span className="text-sm font-medium">{t.minimized}</span>
        {agentsOnline && (
          <span className="w-2 h-2 bg-green-400 rounded-full" />
        )}
      </button>
    )
  }

  // Minimized chat window
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-72 bg-card rounded-lg shadow-xl border overflow-hidden">
        <div
          className="flex items-center justify-between p-3 bg-primary text-primary-foreground cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center gap-2">
            <MessageCircle size={18} />
            <span className="font-medium text-sm">{t.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
              }}
              className="p-1 hover:opacity-70"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Full chat window
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 bg-card rounded-lg shadow-xl border overflow-hidden flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} />
          <div>
            <div className="font-medium text-sm">{t.title}</div>
            <div className="text-xs opacity-80 flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-full", agentsOnline ? "bg-green-400" : "bg-gray-400")} />
              {agentsOnline ? t.online : t.offline}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(true)} className="p-1 hover:opacity-70">
            <MinusCircle size={16} />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:opacity-70">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
        {/* No session yet - show start chat or offline form */}
        {!session && !showOfflineForm && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle size={48} className="text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">{t.subtitle}</h3>
            {agentsOnline ? (
              <Button onClick={handleStartChat} className="mt-4">
                {t.startChat}
              </Button>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-3">{t.agentsOffline}</p>
                <Button onClick={() => setShowOfflineForm(true)} variant="outline">
                  {t.leaveMessage}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Offline form */}
        {showOfflineForm && offlineFormStatus !== "success" && (
          <div className="space-y-3">
            <h3 className="font-medium">{t.offlineForm.title}</h3>
            <p className="text-sm text-muted-foreground">{t.offlineForm.description}</p>
            <Input
              placeholder={t.offlineForm.name}
              value={offlineFormData.name}
              onChange={(e) => setOfflineFormData((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Input
              type="email"
              placeholder={t.offlineForm.email}
              value={offlineFormData.email}
              onChange={(e) => setOfflineFormData((prev) => ({ ...prev, email: e.target.value }))}
            />
            <Textarea
              placeholder={t.offlineForm.message}
              value={offlineFormData.message}
              onChange={(e) => setOfflineFormData((prev) => ({ ...prev, message: e.target.value }))}
              rows={3}
            />
            <Button
              onClick={handleOfflineSubmit}
              disabled={offlineFormStatus === "sending" || !offlineFormData.name || !offlineFormData.email || !offlineFormData.message}
              className="w-full"
            >
              {offlineFormStatus === "sending" ? t.connecting : t.offlineForm.submit}
            </Button>
            {offlineFormStatus === "error" && (
              <p className="text-sm text-destructive">{t.offlineForm.error}</p>
            )}
          </div>
        )}

        {/* Offline form success */}
        {offlineFormStatus === "success" && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="text-green-600" size={24} />
            </div>
            <p className="text-sm text-muted-foreground">{t.offlineForm.success}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setShowOfflineForm(false)
                setOfflineFormStatus("idle")
                setIsOpen(false)
              }}
            >
              {t.endChat}
            </Button>
          </div>
        )}

        {/* Chat messages */}
        {session && session.status !== "RESOLVED" && (
          <>
            {session.messages?.map(renderMessage)}
            {session.status === "WAITING" && !session.agentId && (
              <div className="text-center text-sm text-muted-foreground">{t.waiting}</div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Chat ended */}
        {session?.status === "RESOLVED" && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-muted-foreground">{t.chatEnded}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                localStorage.removeItem("chat_guest_id")
                setGuestId(getGuestId())
                refetchSession()
              }}
            >
              {t.startChat}
            </Button>
          </div>
        )}
      </div>

      {/* Input area */}
      {session && session.status !== "RESOLVED" && (
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Input
              placeholder={t.typeMessage}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={sendMessage.isPending}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessage.isPending}
            >
              <Send size={18} />
            </Button>
          </div>
          <div className="flex justify-end mt-2">
            <Button variant="ghost" size="sm" onClick={handleEndChat} className="text-xs text-muted-foreground">
              {t.endChat}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
