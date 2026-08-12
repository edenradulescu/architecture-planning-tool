"use client"

import { useState } from "react"
import { ClientSideSuspense, useErrorListener } from "@liveblocks/react/suspense"
import { ErrorBoundary } from "react-error-boundary"

import { Canvas } from "@/components/editor/canvas"
import type { CanvasSaveStatus } from "@/types/canvas"

interface CanvasRoomProps {
  roomId: string
  isTemplatesModalOpen: boolean
  onTemplatesModalOpenChange: (open: boolean) => void
  onSaveStatusChange: (status: CanvasSaveStatus) => void
}

function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-page">
      <span className="text-sm text-copy-muted">Loading canvas…</span>
    </div>
  )
}

function CanvasConnectionError() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-page">
      <span className="text-sm text-copy-muted">
        Could not connect to the canvas. Try refreshing the page.
      </span>
    </div>
  )
}

function RoomConnectionGuard({ children }: { children: React.ReactNode }) {
  const [hasConnectionError, setHasConnectionError] = useState(false)

  useErrorListener((error) => {
    if (error.context.type === "ROOM_CONNECTION_ERROR") {
      setHasConnectionError(true)
    }
  })

  if (hasConnectionError) {
    return <CanvasConnectionError />
  }

  return children
}

// The LiveblocksProvider/RoomProvider connection itself lives one level up,
// in WorkspaceShell — AiSidebar needs to share the same room connection (for
// the AI status feed and presence) as a sibling of this component, and a
// RoomProvider can only be established once per room, above every consumer.
export function CanvasRoom({
  roomId,
  isTemplatesModalOpen,
  onTemplatesModalOpenChange,
  onSaveStatusChange,
}: CanvasRoomProps) {
  return (
    <RoomConnectionGuard>
      <ErrorBoundary fallback={<CanvasConnectionError />}>
        <ClientSideSuspense fallback={<CanvasLoading />}>
          <Canvas
            roomId={roomId}
            isTemplatesModalOpen={isTemplatesModalOpen}
            onTemplatesModalOpenChange={onTemplatesModalOpenChange}
            onSaveStatusChange={onSaveStatusChange}
          />
        </ClientSideSuspense>
      </ErrorBoundary>
    </RoomConnectionGuard>
  )
}
