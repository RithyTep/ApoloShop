"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Eye,
  Code2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
  disabled?: boolean
}

interface ToolbarButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}

function ToolbarButton({ icon, label, onClick, active, disabled }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 w-8 p-0",
        active && "bg-muted"
      )}
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      {icon}
    </Button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
  minHeight = "300px",
  className,
  disabled = false,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<"visual" | "html">("visual")
  const editorRef = useRef<HTMLDivElement>(null)
  const [history, setHistory] = useState<string[]>([value])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Sync external value changes
  useEffect(() => {
    if (editorRef.current && mode === "visual") {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value
      }
    }
  }, [value, mode])

  // Save to history
  const saveToHistory = useCallback((newValue: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(newValue)
      // Keep last 50 states
      if (newHistory.length > 50) newHistory.shift()
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [historyIndex])

  // Handle content change
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML
      onChange(newValue)
    }
  }, [onChange])

  // Handle blur to save history
  const handleBlur = useCallback(() => {
    if (editorRef.current) {
      saveToHistory(editorRef.current.innerHTML)
    }
  }, [saveToHistory])

  // Execute command
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }, [handleInput])

  // Format actions
  const formatBold = () => execCommand("bold")
  const formatItalic = () => execCommand("italic")
  const formatUnderline = () => execCommand("underline")
  const formatH1 = () => execCommand("formatBlock", "h1")
  const formatH2 = () => execCommand("formatBlock", "h2")
  const formatH3 = () => execCommand("formatBlock", "h3")
  const formatQuote = () => execCommand("formatBlock", "blockquote")
  const formatCode = () => execCommand("formatBlock", "pre")
  const formatUL = () => execCommand("insertUnorderedList")
  const formatOL = () => execCommand("insertOrderedList")
  const alignLeft = () => execCommand("justifyLeft")
  const alignCenter = () => execCommand("justifyCenter")
  const alignRight = () => execCommand("justifyRight")

  // Insert link
  const insertLink = () => {
    const url = prompt("Enter URL:")
    if (url) {
      execCommand("createLink", url)
    }
  }

  // Insert image
  const insertImage = () => {
    const url = prompt("Enter image URL:")
    if (url) {
      execCommand("insertImage", url)
    }
  }

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      const prevValue = history[newIndex]
      onChange(prevValue)
      if (editorRef.current) {
        editorRef.current.innerHTML = prevValue
      }
    }
  }, [historyIndex, history, onChange])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      const nextValue = history[newIndex]
      onChange(nextValue)
      if (editorRef.current) {
        editorRef.current.innerHTML = nextValue
      }
    }
  }, [historyIndex, history, onChange])

  // Handle HTML mode changes
  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-background", className)}>
      {/* Toolbar */}
      <div className="border-b bg-muted/30 p-1 flex flex-wrap gap-0.5">
        {/* Text formatting */}
        <div className="flex items-center border-r pr-1 mr-1">
          <ToolbarButton icon={<Bold size={14} />} label="Bold" onClick={formatBold} disabled={disabled || mode === "html"} />
          <ToolbarButton icon={<Italic size={14} />} label="Italic" onClick={formatItalic} disabled={disabled || mode === "html"} />
          <ToolbarButton icon={<Underline size={14} />} label="Underline" onClick={formatUnderline} disabled={disabled || mode === "html"} />
        </div>

        {/* Headings */}
        <div className="flex items-center border-r pr-1 mr-1">
          <ToolbarButton icon={<Heading1 size={14} />} label="Heading 1" onClick={formatH1} disabled={disabled || mode === "html"} />
          <ToolbarButton icon={<Heading2 size={14} />} label="Heading 2" onClick={formatH2} disabled={disabled || mode === "html"} />
          <ToolbarButton icon={<Heading3 size={14} />} label="Heading 3" onClick={formatH3} disabled={disabled || mode === "html"} />
        </div>

        {/* Blocks */}
        <div className="flex items-center border-r pr-1 mr-1">
          <ToolbarButton icon={<Quote size={14} />} label="Blockquote" onClick={formatQuote} disabled={disabled || mode === "html"} />
          <ToolbarButton icon={<Code size={14} />} label="Code Block" onClick={formatCode} disabled={disabled || mode === "html"} />
        </div>

        {/* Lists */}
        <div className="flex items-center border-r pr-1 mr-1">
          <ToolbarButton icon={<List size={14} />} label="Bullet List" onClick={formatUL} disabled={disabled || mode === "html"} />
          <ToolbarButton icon={<ListOrdered size={14} />} label="Numbered List" onClick={formatOL} disabled={disabled || mode === "html"} />
        </div>

        {/* Alignment */}
        <div className="flex items-center border-r pr-1 mr-1">
          <ToolbarButton icon={<AlignLeft size={14} />} label="Align Left" onClick={alignLeft} disabled={disabled || mode === "html"} />
          <ToolbarButton icon={<AlignCenter size={14} />} label="Align Center" onClick={alignCenter} disabled={disabled || mode === "html"} />
          <ToolbarButton icon={<AlignRight size={14} />} label="Align Right" onClick={alignRight} disabled={disabled || mode === "html"} />
        </div>

        {/* Insert */}
        <div className="flex items-center border-r pr-1 mr-1">
          <ToolbarButton icon={<Link size={14} />} label="Insert Link" onClick={insertLink} disabled={disabled || mode === "html"} />
          <ToolbarButton icon={<Image size={14} />} label="Insert Image" onClick={insertImage} disabled={disabled || mode === "html"} />
        </div>

        {/* History */}
        <div className="flex items-center border-r pr-1 mr-1">
          <ToolbarButton
            icon={<Undo size={14} />}
            label="Undo"
            onClick={undo}
            disabled={disabled || mode === "html" || historyIndex === 0}
          />
          <ToolbarButton
            icon={<Redo size={14} />}
            label="Redo"
            onClick={redo}
            disabled={disabled || mode === "html" || historyIndex >= history.length - 1}
          />
        </div>

        {/* Mode toggle */}
        <div className="flex items-center ml-auto">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "visual" | "html")}>
            <TabsList className="h-8">
              <TabsTrigger value="visual" className="h-6 text-xs px-2 gap-1">
                <Eye size={12} /> Visual
              </TabsTrigger>
              <TabsTrigger value="html" className="h-6 text-xs px-2 gap-1">
                <Code2 size={12} /> HTML
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Editor area */}
      {mode === "visual" ? (
        <div
          ref={editorRef}
          className="p-4 outline-none prose prose-sm dark:prose-invert max-w-none overflow-auto"
          style={{ minHeight }}
          contentEditable={!disabled}
          onInput={handleInput}
          onBlur={handleBlur}
          dangerouslySetInnerHTML={{ __html: value || `<p>${placeholder}</p>` }}
          suppressContentEditableWarning
          data-placeholder={placeholder}
        />
      ) : (
        <Textarea
          value={value}
          onChange={handleHtmlChange}
          placeholder={placeholder}
          disabled={disabled}
          className="rounded-none border-0 font-mono text-sm resize-none"
          style={{ minHeight }}
        />
      )}
    </div>
  )
}
