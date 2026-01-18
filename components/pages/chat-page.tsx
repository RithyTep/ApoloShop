"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  MessageCircle,
  Send,
  User,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Zap,
  Trash,
  Edit,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import {
  useChatSessions,
  useChatSession,
  useUpdateChatSession,
  useSendChatMessage,
  useMarkMessagesRead,
  useAgentHeartbeat,
  useCannedResponses,
  useCreateCannedResponse,
  useUpdateCannedResponse,
  useDeleteCannedResponse,
  ChatSession,
  ChatSessionStatus,
  ChatMessage,
  CannedResponse,
} from "@/lib/api-hooks"

const statusFilters: { value: ChatSessionStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Chats" },
  { value: "ACTIVE", label: "Active" },
  { value: "WAITING", label: "Waiting" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "OFFLINE", label: "Offline Messages" },
]

export function ChatPage() {
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState<ChatSessionStatus | "ALL">("ALL")
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [showCannedResponses, setShowCannedResponses] = useState(false)
  const [isAddingCannedResponse, setIsAddingCannedResponse] = useState(false)
  const [editingCannedResponse, setEditingCannedResponse] = useState<CannedResponse | null>(null)
  const [newCannedResponse, setNewCannedResponse] = useState({
    title: "",
    contentEn: "",
    contentKh: "",
    category: "",
    shortcut: "",
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mock agent ID (in production, get from auth context)
  const agentId = "admin-user-1"
  const agentName = "Support Agent"

  // Send heartbeat to mark agent as online
  const heartbeat = useAgentHeartbeat()

  useEffect(() => {
    // Send initial heartbeat
    heartbeat.mutate({ userId: agentId, isOnline: true })

    // Send heartbeat every 30 seconds
    const interval = setInterval(() => {
      heartbeat.mutate({ userId: agentId, isOnline: true })
    }, 30000)

    // Mark offline when leaving
    return () => {
      clearInterval(interval)
      heartbeat.mutate({ userId: agentId, isOnline: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId])

  // Fetch sessions
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useChatSessions({
    status: statusFilter === "ALL" ? undefined : statusFilter,
  })

  const sessions = sessionsData?.sessions || []
  const unreadCount = sessionsData?.unreadCount || 0

  // Fetch selected session with messages
  const { data: selectedSessionData } = useChatSession(selectedSessionId || undefined)
  const selectedSession = selectedSessionData?.session

  // Mutations
  const updateSession = useUpdateChatSession()
  const sendMessage = useSendChatMessage()
  const markRead = useMarkMessagesRead()

  // Canned responses
  const { data: cannedData, refetch: refetchCanned } = useCannedResponses()
  const cannedResponses = cannedData?.responses || []
  const cannedCategories = cannedData?.categories || []
  const createCanned = useCreateCannedResponse()
  const updateCanned = useUpdateCannedResponse()
  const deleteCanned = useDeleteCannedResponse()

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (selectedSession?.messages) {
      scrollToBottom()
    }
  }, [selectedSession?.messages, scrollToBottom])

  // Mark messages as read when selecting a session
  useEffect(() => {
    if (selectedSessionId && selectedSession?.messages?.some((m) => !m.isRead && m.sender === "CUSTOMER")) {
      markRead.mutate({ sessionId: selectedSessionId, sender: "CUSTOMER" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId, selectedSession?.messages?.length])

  // Handle joining a chat
  const handleJoinChat = async (sessionId: string) => {
    await updateSession.mutateAsync({
      sessionId,
      agentId,
      agentName,
      status: "ACTIVE",
    })
    setSelectedSessionId(sessionId)
    toast({ title: "Joined chat", description: "You are now connected to this customer" })
  }

  // Handle resolving a chat
  const handleResolveChat = async () => {
    if (!selectedSessionId) return
    await updateSession.mutateAsync({
      sessionId: selectedSessionId,
      status: "RESOLVED",
    })
    toast({ title: "Chat resolved", description: "The chat has been marked as resolved" })
    setSelectedSessionId(null)
  }

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!message.trim() || !selectedSessionId) return

    await sendMessage.mutateAsync({
      sessionId: selectedSessionId,
      sender: "AGENT",
      senderId: agentId,
      senderName: agentName,
      content: message.trim(),
    })

    setMessage("")
  }

  // Handle inserting canned response
  const handleInsertCanned = (content: string) => {
    setMessage((prev) => (prev ? `${prev}\n${content}` : content))
    setShowCannedResponses(false)
  }

  // Handle shortcut in message input
  const handleMessageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }

    // Check for canned response shortcuts
    if (e.key === "/" && message === "") {
      setShowCannedResponses(true)
    }
  }

  // Handle creating canned response
  const handleCreateCannedResponse = async () => {
    if (!newCannedResponse.title || !newCannedResponse.contentEn) return

    try {
      await createCanned.mutateAsync({
        ...newCannedResponse,
        shortcut: newCannedResponse.shortcut || undefined,
        category: newCannedResponse.category || undefined,
      })
      toast({ title: "Success", description: "Canned response created" })
      setIsAddingCannedResponse(false)
      setNewCannedResponse({ title: "", contentEn: "", contentKh: "", category: "", shortcut: "" })
      refetchCanned()
    } catch {
      toast({ title: "Error", description: "Failed to create canned response", variant: "destructive" })
    }
  }

  // Handle updating canned response
  const handleUpdateCannedResponse = async () => {
    if (!editingCannedResponse) return

    try {
      await updateCanned.mutateAsync({
        id: editingCannedResponse.id,
        title: editingCannedResponse.title,
        contentEn: editingCannedResponse.contentEn,
        contentKh: editingCannedResponse.contentKh || undefined,
        category: editingCannedResponse.category || undefined,
        shortcut: editingCannedResponse.shortcut || undefined,
      })
      toast({ title: "Success", description: "Canned response updated" })
      setEditingCannedResponse(null)
      refetchCanned()
    } catch {
      toast({ title: "Error", description: "Failed to update canned response", variant: "destructive" })
    }
  }

  // Handle deleting canned response
  const handleDeleteCannedResponse = async (id: string) => {
    try {
      await deleteCanned.mutateAsync(id)
      toast({ title: "Success", description: "Canned response deleted" })
      refetchCanned()
    } catch {
      toast({ title: "Error", description: "Failed to delete canned response", variant: "destructive" })
    }
  }

  // Format timestamp
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  // Get status badge
  const getStatusBadge = (status: ChatSessionStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">Active</Badge>
      case "WAITING":
        return <Badge variant="warning">Waiting</Badge>
      case "RESOLVED":
        return <Badge variant="secondary">Resolved</Badge>
      case "OFFLINE":
        return <Badge variant="info">Offline</Badge>
    }
  }

  // Render message
  const renderMessage = (msg: ChatMessage) => {
    const isAgent = msg.sender === "AGENT"
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
      <div key={msg.id} className={cn("flex mb-3", isAgent ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[75%] rounded-lg px-3 py-2",
            isAgent ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          {!isAgent && msg.senderName && (
            <div className="text-xs font-medium mb-1">{msg.senderName}</div>
          )}
          <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
          <div
            className={cn(
              "text-[10px] mt-1 flex items-center gap-1",
              isAgent ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {isAgent && msg.isRead && <CheckCircle size={10} />}
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (sessionsLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px] col-span-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MessageCircle className="h-7 w-7" />
            Live Chat
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            Real-time customer support and messaging
            {unreadCount > 0 && (
              <Badge variant="warning">{unreadCount} unread</Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchSessions()}>
            <RefreshCw size={14} className="mr-1" />
            Refresh
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-success rounded-full" />
            You are online
          </div>
        </div>
      </div>

      <Tabs defaultValue="chats" className="h-[calc(100%-80px)]">
        <TabsList>
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="canned">Canned Responses</TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="h-full mt-4">
          <div className="grid grid-cols-3 gap-6 h-full">
            {/* Sessions List */}
            <Card className="overflow-hidden flex flex-col">
              <div className="p-3 border-b">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => setStatusFilter(val as ChatSessionStatus | "ALL")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
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

              <div className="flex-1 overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No chat sessions</p>
                  </div>
                ) : (
                  sessions.map((session: ChatSession) => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={cn(
                        "w-full p-3 border-b text-left hover:bg-muted/50 transition-colors",
                        selectedSessionId === session.id && "bg-muted"
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {session.customerName || session.customerEmail || `Guest ${session.guestId?.slice(-6)}`}
                          </span>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>
                      {session.messages?.[0] && (
                        <p className="text-xs text-muted-foreground line-clamp-1 ml-5">
                          {session.messages[0].content}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1 ml-5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(session.lastActivityAt)}
                        </span>
                        {session._count?.messages ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {session._count.messages} unread
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Card>

            {/* Chat Window */}
            <Card className="col-span-2 overflow-hidden flex flex-col">
              {selectedSession ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {selectedSession.customerName || selectedSession.customerEmail || `Guest ${selectedSession.guestId?.slice(-6)}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedSession.customerEmail || "No email"}
                        {selectedSession.pageUrl && ` • ${selectedSession.pageUrl}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!selectedSession.agentId && selectedSession.status !== "RESOLVED" && (
                        <Button size="sm" onClick={() => handleJoinChat(selectedSession.id)}>
                          Join Chat
                        </Button>
                      )}
                      {selectedSession.status !== "RESOLVED" && (
                        <Button size="sm" variant="outline" onClick={handleResolveChat}>
                          <CheckCircle size={14} className="mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {selectedSession.messages?.map(renderMessage)}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  {selectedSession.status !== "RESOLVED" && (
                    <div className="p-3 border-t">
                      {showCannedResponses && (
                        <div className="mb-2 p-2 bg-muted rounded-lg max-h-40 overflow-y-auto">
                          <div className="text-xs font-medium mb-2">Quick Responses</div>
                          {cannedResponses.map((canned) => (
                            <button
                              key={canned.id}
                              onClick={() => handleInsertCanned(canned.contentEn)}
                              className="w-full text-left p-2 text-sm hover:bg-background rounded"
                            >
                              <span className="font-medium">{canned.title}</span>
                              {canned.shortcut && (
                                <span className="ml-2 text-xs text-muted-foreground">{canned.shortcut}</span>
                              )}
                            </button>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-1"
                            onClick={() => setShowCannedResponses(false)}
                          >
                            <XCircle size={14} className="mr-1" />
                            Close
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowCannedResponses(!showCannedResponses)}
                        >
                          <Zap size={16} />
                        </Button>
                        <Input
                          placeholder="Type a message... (press / for quick responses)"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={handleMessageKeyDown}
                          disabled={sendMessage.isPending}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!message.trim() || sendMessage.isPending}
                        >
                          <Send size={16} />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a chat to start responding</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="canned" className="h-full mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Canned Responses</h2>
              <Dialog open={isAddingCannedResponse} onOpenChange={setIsAddingCannedResponse}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus size={14} className="mr-1" />
                    Add Response
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Canned Response</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={newCannedResponse.title}
                        onChange={(e) => setNewCannedResponse((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Greeting"
                      />
                    </div>
                    <div>
                      <Label>Content (English)</Label>
                      <Textarea
                        value={newCannedResponse.contentEn}
                        onChange={(e) => setNewCannedResponse((prev) => ({ ...prev, contentEn: e.target.value }))}
                        placeholder="Hello! How can I help you today?"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Content (Khmer) - Optional</Label>
                      <Textarea
                        value={newCannedResponse.contentKh}
                        onChange={(e) => setNewCannedResponse((prev) => ({ ...prev, contentKh: e.target.value }))}
                        placeholder="សួស្តី! តើខ្ញុំអាចជួយអ្នកយ៉ាងដូចម្តេច?"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Category (Optional)</Label>
                        <Input
                          value={newCannedResponse.category}
                          onChange={(e) => setNewCannedResponse((prev) => ({ ...prev, category: e.target.value }))}
                          placeholder="e.g., Shipping"
                        />
                      </div>
                      <div>
                        <Label>Shortcut (Optional)</Label>
                        <Input
                          value={newCannedResponse.shortcut}
                          onChange={(e) => setNewCannedResponse((prev) => ({ ...prev, shortcut: e.target.value }))}
                          placeholder="e.g., /hello"
                        />
                      </div>
                    </div>
                    <Button onClick={handleCreateCannedResponse} className="w-full" disabled={createCanned.isPending}>
                      Create Response
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {cannedCategories.length > 0 && (
              <div className="flex gap-2 mb-4">
                {cannedCategories.map((cat) => (
                  <Badge key={cat} variant="outline">
                    {cat}
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {cannedResponses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No canned responses yet</p>
                  <p className="text-sm">Add quick responses to speed up your chat support</p>
                </div>
              ) : (
                cannedResponses.map((canned) => (
                  <Card key={canned.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{canned.title}</span>
                          {canned.shortcut && (
                            <Badge variant="outline" className="text-xs">
                              {canned.shortcut}
                            </Badge>
                          )}
                          {canned.category && (
                            <Badge variant="secondary" className="text-xs">
                              {canned.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{canned.contentEn}</p>
                        {canned.contentKh && (
                          <p className="text-sm text-muted-foreground mt-1">{canned.contentKh}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingCannedResponse(canned)}
                            >
                              <Edit size={14} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Canned Response</DialogTitle>
                            </DialogHeader>
                            {editingCannedResponse && (
                              <div className="space-y-4">
                                <div>
                                  <Label>Title</Label>
                                  <Input
                                    value={editingCannedResponse.title}
                                    onChange={(e) =>
                                      setEditingCannedResponse((prev) =>
                                        prev ? { ...prev, title: e.target.value } : null
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>Content (English)</Label>
                                  <Textarea
                                    value={editingCannedResponse.contentEn}
                                    onChange={(e) =>
                                      setEditingCannedResponse((prev) =>
                                        prev ? { ...prev, contentEn: e.target.value } : null
                                      )
                                    }
                                    rows={3}
                                  />
                                </div>
                                <div>
                                  <Label>Content (Khmer)</Label>
                                  <Textarea
                                    value={editingCannedResponse.contentKh || ""}
                                    onChange={(e) =>
                                      setEditingCannedResponse((prev) =>
                                        prev ? { ...prev, contentKh: e.target.value } : null
                                      )
                                    }
                                    rows={3}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Category</Label>
                                    <Input
                                      value={editingCannedResponse.category || ""}
                                      onChange={(e) =>
                                        setEditingCannedResponse((prev) =>
                                          prev ? { ...prev, category: e.target.value } : null
                                        )
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>Shortcut</Label>
                                    <Input
                                      value={editingCannedResponse.shortcut || ""}
                                      onChange={(e) =>
                                        setEditingCannedResponse((prev) =>
                                          prev ? { ...prev, shortcut: e.target.value } : null
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                                <Button
                                  onClick={handleUpdateCannedResponse}
                                  className="w-full"
                                  disabled={updateCanned.isPending}
                                >
                                  Update Response
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCannedResponse(canned.id)}
                        >
                          <Trash size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
