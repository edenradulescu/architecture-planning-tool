import { Liveblocks, LiveblocksError } from "@liveblocks/node"

import { CHAT_FEED_ID } from "@/types/tasks"

const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined
}

// Constructed lazily (not at module scope) because the Liveblocks constructor
// eagerly validates the secret key format, which would otherwise throw during
// `next build`'s page-data collection for any route that imports this module.
export function getLiveblocksClient(): Liveblocks {
  if (!globalForLiveblocks.liveblocks) {
    globalForLiveblocks.liveblocks = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY!,
    })
  }
  return globalForLiveblocks.liveblocks
}

// Unlike rooms (getOrCreateRoom), Liveblocks has no getOrCreateFeed
// convenience — createFeed on a feed that already exists rejects with a 409
// LiveblocksError. Called once per room connection from
// app/api/liveblocks-auth/route.ts (the same place getOrCreateRoom already
// runs) so every client can assume the `ai-chat` feed exists by the time it
// tries to send a message, without every client racing to create it itself.
export async function ensureChatFeedExists(liveblocks: Liveblocks, roomId: string) {
  try {
    await liveblocks.createFeed({ roomId, feedId: CHAT_FEED_ID })
  } catch (error) {
    if (error instanceof LiveblocksError && error.status === 409) return
    throw error
  }
}

const CURSOR_COLORS = [
  "#F87171",
  "#FB923C",
  "#FBBF24",
  "#A3E635",
  "#34D399",
  "#22D3EE",
  "#60A5FA",
  "#A78BFA",
  "#F472B6",
]

export function getCursorColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length
  return CURSOR_COLORS[index]
}

// The Liveblocks presence identity trigger/design-agent.ts sets for the AI
// while it's working, so it shows up in useOthers()/PresenceAvatars/
// PresenceCursors exactly like a real collaborator — no separate presence
// UI needed. AI accent color, per ui-context.md's "AI accent" token.
export const AI_AGENT_USER_ID = "ai-agent"
export const AI_AGENT_NAME = "Ghost AI"
export const AI_AGENT_COLOR = "#6457f9"
