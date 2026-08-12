import type { LiveMap, LiveObject } from "@liveblocks/client";

import type { CanvasEdgeData, CanvasNodeData } from "@/types/canvas";
import type { AiStatusFeedPayload, ChatMessage } from "@/types/tasks";

// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: { x: number; y: number } | null;
      thinking: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    // The "flow" key is written by @liveblocks/react-flow's useLiveblocksFlow
    // (components/editor/canvas.tsx) — typed here to match its actual shape
    // (was left as an empty placeholder before this) so trigger/design-agent.ts
    // can safely read and mutate it directly from the backend via
    // Liveblocks.mutateStorage, the same shared collaborative flow every
    // client-side node/edge change already goes through.
    Storage: {
      flow: LiveObject<{
        nodes: LiveMap<
          string,
          LiveObject<{
            id: string;
            type: "canvasNode";
            position: { x: number; y: number };
            width: number;
            height: number;
            data: CanvasNodeData;
          }>
        >;
        edges: LiveMap<
          string,
          LiveObject<{
            id: string;
            source: string;
            target: string;
            data: CanvasEdgeData;
          }>
        >;
      }>;
    };

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener. Broadcast by
    // trigger/design-agent.ts at each key step (start/processing/complete/
    // error) to the shared `ai-status-feed` — every participant's AI sidebar
    // subscribes to this and renders only the latest message, not just the
    // user who triggered the run. Payload contract lives in types/tasks.ts
    // so both the publisher and the subscriber validate against the same
    // schema; kept generic (no canvas-specific fields) so future generators
    // (e.g. spec generation) can publish to the same feed.
    RoomEvent: { type: "ai-status-feed" } & AiStatusFeedPayload;

    // Data shape for messages in the room-scoped `ai-chat` Liveblocks feed
    // (components/editor/ai-sidebar.tsx's "Chat" tab) — realtime chat
    // between the people in a room, deliberately separate from RoomEvent's
    // `ai-status-feed` above, which is for AI progress broadcasts, not
    // human chat. Payload contract lives in types/tasks.ts, same
    // single-source-of-truth pattern as AiStatusFeedPayload.
    FeedMessageData: ChatMessage;

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: Record<string, never>;

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: Record<string, never>;
  }
}

export {};
