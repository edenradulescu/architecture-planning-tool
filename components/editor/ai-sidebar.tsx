"use client"

import { Bot, Download, FileText, Send, X } from "lucide-react"
import { useState } from "react"
import type { KeyboardEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

const TAB_TRIGGER_CLASS = cn(
  "flex-1 text-copy-muted data-active:bg-ai data-active:text-ai-text"
)

function AiArchitectTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")

  function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed) return
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
    ])
    setInput("")
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Bot className="h-8 w-8 text-copy-faint" />
            <p className="max-w-[16rem] text-sm text-copy-muted">
              Describe what you want to build and Ghost AI will help
              architect it.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-full bg-subtle px-3 py-1.5 text-xs text-ai-text transition-colors hover:bg-subtle/70"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-auto border-2 border-brand/50 bg-accent-dim text-copy-primary"
                    : "mr-auto border border-surface-border bg-elevated text-ai-text"
                )}
              >
                {message.content}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-surface-border-subtle p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            className="min-h-[72px] max-h-40 resize-none"
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            aria-label="Send message"
            className="bg-ai text-white hover:bg-ai/90"
          >
            <Send />
          </Button>
        </div>
      </div>
    </div>
  )
}

function SpecsTab() {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-3">
      <Button className="w-full bg-ai text-white hover:bg-ai/90">
        <FileText />
        Generate Spec
      </Button>
      <div className="rounded-2xl border border-surface-border bg-elevated p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ai/15">
            <FileText className="h-4 w-4 text-ai-text" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="truncate text-sm font-semibold text-copy-primary">
              Architecture Spec
            </h3>
            <p className="line-clamp-3 text-xs leading-relaxed text-copy-muted">
              A concise architecture specification generated from your AI
              Architect conversation, covering services, data flow, and
              deployment.
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end border-t border-surface-border-subtle pt-3">
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="gap-1.5 text-copy-muted"
          >
            <Download />
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "fixed top-[4.25rem] right-3 bottom-3 z-40 flex w-96 flex-col overflow-hidden rounded-2xl border border-surface-border bg-elevated/95 shadow-2xl backdrop-blur-sm transition-transform duration-200 ease-out",
        isOpen
          ? "translate-x-0"
          : "pointer-events-none translate-x-[calc(100%+0.75rem)]"
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-surface-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-ai-text" />
          <div className="flex flex-col leading-tight">
            <h2 className="text-sm font-semibold text-copy-primary">
              AI Workspace
            </h2>
            <p className="text-xs text-copy-muted">Collaborate with Ghost AI</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI sidebar"
        >
          <X />
        </Button>
      </div>

      <Tabs defaultValue="architect" className="flex flex-1 flex-col overflow-hidden">
        <div className="shrink-0 px-4 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="architect" className={TAB_TRIGGER_CLASS}>
              AI Architect
            </TabsTrigger>
            <TabsTrigger value="specs" className={TAB_TRIGGER_CLASS}>
              Specs
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent
          value="architect"
          className="flex flex-1 flex-col overflow-hidden"
        >
          <AiArchitectTab />
        </TabsContent>
        <TabsContent
          value="specs"
          className="flex flex-1 flex-col overflow-hidden"
        >
          <SpecsTab />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
