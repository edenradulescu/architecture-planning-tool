"use client"

import { useUser } from "@clerk/nextjs"
import { useOthers } from "@liveblocks/react/suspense"
import { useReactFlow, useViewport } from "@xyflow/react"

function CursorPointer({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M2 1.5 15.5 8 9 9.5 6.5 16 2 1.5Z"
        fill={color}
        stroke="var(--bg-base)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PresenceCursors() {
  const { user } = useUser()
  const others = useOthers()
  const { flowToScreenPosition } = useReactFlow()
  // Subscribing to the viewport keeps cursor screen positions in sync while
  // the local user pans/zooms, not just when another participant's presence
  // changes — flowToScreenPosition reads live viewport state on every call,
  // but nothing else here would otherwise trigger a re-render on pan/zoom.
  useViewport()

  const cursors = others
    .filter((other) => other.id !== user?.id && other.presence.cursor !== null)
    .map((other) => ({
      connectionId: other.connectionId,
      name: other.info?.name ?? "Guest",
      color: other.info?.color ?? "#f8fafc",
      screen: flowToScreenPosition(other.presence.cursor as { x: number; y: number }),
    }))

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {cursors.map((cursor) => (
        <div
          key={cursor.connectionId}
          className="absolute flex items-center gap-1.5"
          style={{ left: cursor.screen.x, top: cursor.screen.y }}
        >
          <CursorPointer color={cursor.color} />
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap text-page"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </span>
        </div>
      ))}
    </div>
  )
}
