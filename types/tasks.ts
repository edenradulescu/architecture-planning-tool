import { z } from "zod"

// Shared payload contract for the `ai-status-feed` Liveblocks room event
// (broadcast by trigger/design-agent.ts, consumed by AiSidebar) — the single
// source of truth both sides validate against, so a malformed or
// out-of-contract event never reaches the UI. Kept generic (no canvas- or
// spec-specific fields) so future generators (e.g. spec generation) can
// publish to the same feed.
export const AI_STATUS_FEED_STATUSES = ["started", "processing", "complete", "error"] as const

export type AiStatusFeedStatus = (typeof AI_STATUS_FEED_STATUSES)[number]

export const aiStatusFeedPayloadSchema = z.object({
  status: z.enum(AI_STATUS_FEED_STATUSES),
  text: z.string().optional(),
  runId: z.string(),
})

export type AiStatusFeedPayload = z.infer<typeof aiStatusFeedPayloadSchema>

// Shared payload contract for the room-scoped `ai-chat` Liveblocks feed —
// realtime chat between the people in a room (feature-specs/25). Kept
// separate from ai-status-feed above: this is human-to-human chat, not AI
// progress/presence updates, and the two must never be mixed on one channel.
export const CHAT_FEED_ID = "ai-chat"

// "assistant" added by feature-specs/26 (design-agent-frontend): the AI
// Architect tab now posts the user's design prompt and Ghost AI's final
// reply into this same feed, per that spec's literal "push the user message
// to the ai-chat feed" / "push a final AI message to ai-chat" — exactly the
// extension feature-specs/25 anticipated when it left this field widenable
// without a schema change.
export const CHAT_MESSAGE_ROLES = ["user", "assistant"] as const

export type ChatMessageRole = (typeof CHAT_MESSAGE_ROLES)[number]

export const chatMessageSchema = z.object({
  sender: z.string().min(1),
  role: z.enum(CHAT_MESSAGE_ROLES),
  content: z.string().min(1),
  timestamp: z.number(),
})

export type ChatMessage = z.infer<typeof chatMessageSchema>
