"use client"

import { useReactFlow } from "@xyflow/react"
import type { ComponentType } from "react"
import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react/suspense"
import { Maximize2, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react"

// Short enough to feel instant, long enough to read as a deliberate motion
// rather than a snap-cut — matches the "short animation" requirement.
const ZOOM_DURATION = 250

interface ControlButtonProps {
  onClick: () => void
  disabled?: boolean
  label: string
  icon: ComponentType<{ className?: string }>
}

function ControlButton({ onClick, disabled, label, icon: Icon }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-subtle hover:text-copy-primary disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export function CanvasControlBar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  return (
    <div className="absolute bottom-6 left-6 z-30 flex items-center gap-1 rounded-full border border-surface-border bg-elevated/95 p-1.5 shadow-lg backdrop-blur-sm">
      <ControlButton
        label="Zoom out"
        icon={ZoomOut}
        onClick={() => void zoomOut({ duration: ZOOM_DURATION })}
      />
      <ControlButton
        label="Fit view"
        icon={Maximize2}
        onClick={() => void fitView({ duration: ZOOM_DURATION })}
      />
      <ControlButton
        label="Zoom in"
        icon={ZoomIn}
        onClick={() => void zoomIn({ duration: ZOOM_DURATION })}
      />
      <div className="mx-1 h-6 w-px bg-surface-border-subtle" />
      <ControlButton label="Undo" icon={Undo2} onClick={undo} disabled={!canUndo} />
      <ControlButton label="Redo" icon={Redo2} onClick={redo} disabled={!canRedo} />
    </div>
  )
}
