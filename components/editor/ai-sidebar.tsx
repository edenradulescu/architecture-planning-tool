"use client"

import { Bot, Download, FileText, Loader2, MessageCircle, Send, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { KeyboardEvent, RefObject } from "react"
import { useUser } from "@clerk/nextjs"
import { useCreateFeedMessage, useFeedMessages } from "@liveblocks/react"
import { useEventListener } from "@liveblocks/react/suspense"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { NODE_COLORS } from "@/types/canvas"
import type { ProjectSpec } from "@/types/project-spec"
import {
  aiStatusFeedPayloadSchema,
  CHAT_FEED_ID,
  chatMessageSchema,
  type AiStatusFeedPayload,
  type ChatMessage as RoomChatMessage,
} from "@/types/tasks"
import type { designAgent } from "@/trigger/design-agent"

// The AI Architect tab's "sender" identity for messages it posts to ai-chat —
// deliberately not imported from lib/liveblocks.ts's AI_AGENT_NAME: that
// module pulls in the server-only @liveblocks/node SDK, which must never end
// up in this client component's bundle.
const AI_SENDER_NAME = "Ghost AI"

// feature-specs/26's literal "green accent (#62C073)" for chat bubbles/the
// submit button/status strip is not a new color — it's the existing "Green"
// pair's text value from the canvas Node Color Palette (ui-context.md),
// reused here rather than hardcoded so it can never drift from that palette.
const AI_CHAT_ACCENT = NODE_COLORS[6].text

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
  roomId: string
  projectId: string
  specs: ProjectSpec[]
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

const TAB_TRIGGER_CLASS = cn(
  "flex-1 text-copy-muted data-active:bg-ai data-active:text-ai-text"
)

// feature-specs/26: the Architect tab's own conversation (the user's design
// prompts and Ghost AI's replies) is now persisted in the same room-scoped
// `ai-chat` Liveblocks feed RoomChatTab already reads/writes (feature-specs/
// 25) — not a private local-only transcript, and not a second feed. This was
// a deliberate, explicit product decision (the feed schema has no "channel"
// field, so the Chat tab can now also show an Architect prompt/reply, and
// vice versa) made when this spec's literal "push to the ai-chat feed"
// collided with 25's original "kept fully separate from AI" design — see
// progress-tracker.md's Architecture Decisions for 26-design-agent-frontend.
function AiArchitectTab({ roomId, projectId }: { roomId: string; projectId: string }) {
  const { user } = useUser()
  const { messages, isLoading, error: loadError } = useFeedMessages(CHAT_FEED_ID)
  const createFeedMessage = useCreateFeedMessage()

  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const [publicToken, setPublicToken] = useState<string | null>(null)
  // Only the single latest message, never the full history — this drives the
  // small shared status strip below, not the chat transcript (which now
  // lives entirely in the persisted feed above).
  const [latestStatus, setLatestStatus] = useState<AiStatusFeedPayload | null>(null)

  // Drives "is a run active" for disabling input/showing the status strip,
  // and is what pushes Ghost AI's final reply to the feed once the run
  // finishes — the literal useRealtimeRun(runId, {accessToken}) usage this
  // unit's spec calls for. `runId` is cleared inside onComplete, so
  // `isGenerating` below transitions back to false the instant this fires.
  useRealtimeRun<typeof designAgent>(runId ?? undefined, {
    accessToken: publicToken ?? undefined,
    enabled: !!runId && !!publicToken,
    skipColumns: ["payload"],
    onComplete: (completedRun, err) => {
      const succeeded = completedRun.status === "COMPLETED"
      const text = succeeded
        ? completedRun.output?.summary?.trim() || "Ghost AI finished updating the canvas."
        : `Ghost AI ran into a problem: ${completedRun.error?.message ?? err?.message ?? "Something went wrong."}`
      createFeedMessage(CHAT_FEED_ID, {
        sender: AI_SENDER_NAME,
        role: "assistant",
        content: text,
        timestamp: Date.now(),
      }).catch(() => {
        // The live ai-status-feed broadcast (below) already carried this
        // same text to everyone currently in the room — a failure here only
        // loses the persisted copy, not the run's own result.
      })
      setRunId(null)
      setPublicToken(null)
    },
  })

  const isGenerating = isSending || !!runId

  // trigger/design-agent.ts broadcasts to the shared `ai-status-feed` room
  // event at each key step (start, processing, complete, error) — every
  // participant with this room open receives it here, not just whoever sent
  // the prompt. Drives only the compact status strip's text now; the final
  // message itself is pushed to the feed from useRealtimeRun's onComplete
  // above, not from here.
  useEventListener(({ event }) => {
    if (event.type !== "ai-status-feed") return
    const parsed = aiStatusFeedPayloadSchema.safeParse(event)
    if (!parsed.success) return
    setLatestStatus(parsed.data)
  })

  const chatMessages = (messages ?? [])
    .map((message) => {
      const parsed = chatMessageSchema.safeParse(message.data)
      return parsed.success ? { id: message.id, ...parsed.data } : null
    })
    .filter((message): message is RoomChatMessage & { id: string } => message !== null)
    .sort((a, b) => a.timestamp - b.timestamp)

  async function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed || isGenerating || !user) return
    setIsSending(true)
    setSendError(false)
    try {
      await createFeedMessage(CHAT_FEED_ID, {
        sender: user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Guest",
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      })
    } catch {
      setSendError(true)
      setIsSending(false)
      return
    }
    setInput("")

    try {
      const response = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, roomId, projectId }),
      })
      const data = (await response.json().catch(() => null)) as {
        runId?: string
        publicToken?: string
        error?: string
      } | null
      if (!response.ok || !data?.runId || !data.publicToken) {
        await createFeedMessage(CHAT_FEED_ID, {
          sender: AI_SENDER_NAME,
          role: "assistant",
          content: data?.error
            ? `Ghost AI couldn't start: ${data.error}`
            : "Ghost AI couldn't start. Please try again.",
          timestamp: Date.now(),
        }).catch(() => {})
        return
      }
      setRunId(data.runId)
      setPublicToken(data.publicToken)
    } catch {
      await createFeedMessage(CHAT_FEED_ID, {
        sender: AI_SENDER_NAME,
        role: "assistant",
        content: "Ghost AI couldn't start. Please try again.",
        timestamp: Date.now(),
      }).catch(() => {})
    } finally {
      setIsSending(false)
    }
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
        {loadError ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-copy-muted">Couldn&apos;t load chat messages.</p>
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-copy-faint" />
          </div>
        ) : chatMessages.length === 0 ? (
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
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col gap-1",
                  message.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div className="flex items-baseline gap-2 px-1">
                  <span className="text-xs font-semibold text-copy-secondary">
                    {message.sender}
                  </span>
                  <span className="text-[10px] text-copy-faint">
                    {formatMessageTime(message.timestamp)}
                  </span>
                </div>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm font-medium",
                    message.role !== "user" &&
                      "border border-surface-border bg-elevated text-ai-text"
                  )}
                  style={
                    message.role === "user"
                      ? { backgroundColor: AI_CHAT_ACCENT, color: "var(--bg-base)" }
                      : undefined
                  }
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!!runId && (
        // Compact strip, dark base + green accent, shown only while a run is
        // active — reflects the single latest ai-status-feed message for
        // everyone in the room, not just whoever sent the prompt.
        <div
          className="flex shrink-0 items-center gap-2 border-t border-surface-border-subtle bg-elevated px-4 py-2 text-xs"
          style={{ color: AI_CHAT_ACCENT }}
        >
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          <span className="truncate">{latestStatus?.text ?? "Ghost AI is working…"}</span>
        </div>
      )}
      <div className="shrink-0 border-t border-surface-border-subtle p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onInput={(event) => {
             const textarea = event.currentTarget
             textarea.style.height = "auto"
             textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
           }}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            disabled={isGenerating}
            className="min-h-[72px] max-h-40 resize-none"
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isGenerating}
            aria-label="Send message"
            style={{ backgroundColor: AI_CHAT_ACCENT, color: "var(--bg-base)" }}
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
        {sendError && (
          <p className="mt-1.5 text-xs text-error">
            Message failed to send. Try again.
          </p>
        )}
      </div>
    </div>
  )
}

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

// Realtime chat between the people in a room, backed by the room-scoped
// `ai-chat` Liveblocks feed (not RoomEvent — feeds persist their messages
// and replay them to late joiners, which a broadcast RoomEvent like
// ai-status-feed does not). This component itself never calls
// /api/ai/design and has no AI-specific logic — but as of feature-specs/26,
// AiArchitectTab posts design prompts and Ghost AI's replies into this exact
// same feed (a deliberate decision, see that function's own comment), so an
// Architect-tab message may now render here too, and vice versa.
function RoomChatTab() {
  const { user } = useUser()
  const { messages, isLoading, error: loadError } = useFeedMessages(CHAT_FEED_ID)
  const createFeedMessage = useCreateFeedMessage()
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendFailed, setSendFailed] = useState(false)

  // Every message is validated against chatMessageSchema before it's
  // trusted and rendered — same precedent as AiArchitectTab's
  // aiStatusFeedPayloadSchema.safeParse for ai-status-feed events.
  const chatMessages = (messages ?? [])
    .map((message) => {
      const parsed = chatMessageSchema.safeParse(message.data)
      return parsed.success ? { id: message.id, ...parsed.data } : null
    })
    .filter((message): message is RoomChatMessage & { id: string } => message !== null)
    .sort((a, b) => a.timestamp - b.timestamp)

  async function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed || isSending || !user) return
    setIsSending(true)
    setSendFailed(false)
    try {
      await createFeedMessage(CHAT_FEED_ID, {
        sender: user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Guest",
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      })
      setInput("")
    } catch {
      setSendFailed(true)
    } finally {
      setIsSending(false)
    }
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
        {loadError ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-copy-muted">Couldn&apos;t load chat messages.</p>
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-copy-faint" />
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <MessageCircle className="h-8 w-8 text-copy-faint" />
            <p className="max-w-[16rem] text-sm text-copy-muted">
              No messages yet. Say hello to your collaborators.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {chatMessages.map((message) => (
              <div key={message.id} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2 px-1">
                  <span className="text-xs font-semibold text-copy-secondary">
                    {message.sender}
                  </span>
                  <span className="text-[10px] text-copy-faint">
                    {formatMessageTime(message.timestamp)}
                  </span>
                </div>
                <div className="max-w-[85%] rounded-2xl border border-surface-border bg-elevated px-3 py-2 text-sm text-copy-primary">
                  {message.content}
                </div>
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
            placeholder="Message the room..."
            disabled={isSending}
            className="min-h-[72px] max-h-40 resize-none"
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isSending}
            aria-label="Send chat message"
            className="bg-brand text-white hover:bg-brand/90"
          >
            {isSending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
        {sendFailed && (
          <p className="mt-1.5 text-xs text-error">
            Message failed to send. Try again.
          </p>
        )}
      </div>
    </div>
  )
}

function formatSpecDate(date: Date): string {
  return new Date(date).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function downloadSpec(projectId: string, spec: ProjectSpec) {
  // The download route already sets Content-Disposition: attachment (see
  // trigger/generate-spec.ts's filename convention, mirrored by
  // lib/specs.ts) — this just points the browser at it and lets it handle
  // the download itself, no Blob access from the client.
  const link = document.createElement("a")
  link.href = `/api/projects/${projectId}/specs/${spec.id}/download`
  link.download = spec.filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

// Markdown elements mapped to token-styled JSX instead of the Tailwind
// Typography plugin (not installed in this project) or its `prose` classes,
// which would bring their own colors and break code-standards.md's
// token-only color rule.
const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="mt-4 text-base font-semibold text-copy-primary first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 text-sm font-semibold text-copy-primary first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 text-sm font-semibold text-copy-secondary first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mt-2 text-sm leading-relaxed text-copy-primary first:mt-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-copy-primary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-copy-primary">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-brand underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-subtle px-1 py-0.5 text-xs text-copy-primary">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-2 overflow-x-auto rounded-xl border border-surface-border-subtle bg-subtle p-3 text-xs text-copy-primary">
      {children}
    </pre>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-copy-primary">{children}</strong>
  ),
}

function SpecPreviewDialog({
  spec,
  projectId,
  onOpenChange,
}: {
  spec: ProjectSpec | null
  projectId: string
  onOpenChange: (open: boolean) => void
}) {
  // Single status union instead of separate content/isLoading/hasError
  // booleans — content only ever lives here, only while the modal for this
  // spec is open, reset the moment `spec` changes or the dialog closes.
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error" }
    | { status: "success"; content: string }
  >({ status: "idle" })

  useEffect(() => {
    if (!spec) return
    let cancelled = false

    async function load(currentSpec: ProjectSpec) {
      setState({ status: "loading" })
      try {
        const response = await fetch(
          `/api/projects/${projectId}/specs/${currentSpec.id}/download`
        )
        if (!response.ok) throw new Error("Failed to load spec")
        const text = await response.text()
        if (!cancelled) setState({ status: "success", content: text })
      } catch {
        if (!cancelled) setState({ status: "error" })
      }
    }

    load(spec)

    return () => {
      cancelled = true
      setState({ status: "idle" })
    }
  }, [spec, projectId])

  return (
    <Dialog open={!!spec} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{spec?.filename}</DialogTitle>
          {spec && (
            <DialogDescription>{formatSpecDate(spec.createdAt)}</DialogDescription>
          )}
        </DialogHeader>
        <ScrollArea className="h-[50vh] rounded-xl border border-surface-border-subtle bg-page">
          <div className="px-4 py-3">
            {state.status === "loading" || state.status === "idle" ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-copy-faint" />
              </div>
            ) : state.status === "error" ? (
              <p className="py-4 text-sm text-copy-muted">
                Couldn&apos;t load this spec.
              </p>
            ) : (
              <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                {state.content}
              </ReactMarkdown>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          {spec && (
            <Button
              onClick={() => downloadSpec(projectId, spec)}
              className="gap-1.5"
            >
              <Download />
              Download
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SpecsTab({ projectId, specs }: { projectId: string; specs: ProjectSpec[] }) {
  const [previewSpec, setPreviewSpec] = useState<ProjectSpec | null>(null)

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
      <Button className="w-full shrink-0 bg-ai text-white hover:bg-ai/90">
        <FileText />
        Generate Spec
      </Button>
      {specs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <FileText className="h-8 w-8 text-copy-faint" />
          <p className="max-w-[16rem] text-sm text-copy-muted">
            No specs generated yet.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-2 pr-3">
            {specs.map((spec) => (
              <div
                key={spec.id}
                className="flex items-center gap-2 rounded-2xl border border-surface-border bg-elevated p-3"
              >
                <button
                  type="button"
                  onClick={() => setPreviewSpec(spec)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ai/15">
                    <FileText className="h-4 w-4 text-ai-text" />
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-copy-primary">
                      {spec.filename}
                    </span>
                    <span className="text-xs text-copy-muted">
                      {formatSpecDate(spec.createdAt)}
                    </span>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => downloadSpec(projectId, spec)}
                  aria-label={`Download ${spec.filename}`}
                  className="shrink-0 text-copy-muted"
                >
                  <Download />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      <SpecPreviewDialog
        spec={previewSpec}
        projectId={projectId}
        onOpenChange={(open) => {
          if (!open) setPreviewSpec(null)
        }}
      />
    </div>
  )
}

export function AiSidebar({
  isOpen,
  onClose,
  triggerRef,
  roomId,
  projectId,
  specs,
}: AiSidebarProps) {
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip the mount render — the sidebar starts closed and nothing has
    // been focused into it yet, so there's no focus to restore.
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // `inert` (below) forces the browser to blur whatever was focused
    // inside the panel the instant it becomes inert — without this, focus
    // would fall back to <body>, silently breaking keyboard navigation.
    if (!isOpen) {
      triggerRef.current?.focus()
    }
  }, [isOpen, triggerRef])

  return (
    <aside
      aria-hidden={!isOpen}
      inert={!isOpen}
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
            <TabsTrigger value="chat" className={TAB_TRIGGER_CLASS}>
              Chat
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
          <AiArchitectTab roomId={roomId} projectId={projectId} />
        </TabsContent>
        <TabsContent
          value="chat"
          className="flex flex-1 flex-col overflow-hidden"
        >
          <RoomChatTab />
        </TabsContent>
        <TabsContent
          value="specs"
          className="flex flex-1 flex-col overflow-hidden"
        >
          <SpecsTab projectId={projectId} specs={specs} />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
