"use client"

import { useCallback, useState } from "react"
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react"
import { EdgeLabelRenderer, getSmoothStepPath, useReactFlow } from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"

import { EDGE_COLOR, type CanvasEdge } from "@/types/canvas"

const LABEL_PLACEHOLDER = "Add label"

export function CanvasEdgeRenderer({
  id,
  data,
  selected,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  style,
}: EdgeProps<CanvasEdge>) {
  const { updateEdgeData } = useReactFlow()
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState("")
  const label = data?.label ?? ""

  // Literal spec requirement: position the label via EdgeLabelRenderer and
  // getSmoothStepPath's own labelX/labelY, not a manually-computed midpoint.
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const startEditing = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation()
      setDraftLabel(label)
      setIsEditing(true)
    },
    [label]
  )

  const commitLabel = useCallback(() => {
    setIsEditing(false)
    updateEdgeData(id, { label: draftLabel.trim() })
  }, [id, draftLabel, updateEdgeData])

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDraftLabel(event.target.value)
  }, [])

  // Escape and Enter both converge on blur (same pattern as the node label
  // editor in canvas-node.tsx) — onBlur is the single place that commits,
  // so "save on blur, Enter, or Escape" is one code path, not three.
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "Escape") {
      event.currentTarget.blur()
    }
  }, [])

  const isBright = !!selected

  return (
    <>
      {/* Invisible wide hit area — widens the hover/click target without
          thickening the visible stroke. Marked `peer` so the visible path
          below can brighten on hover via peer-hover, without needing a
          shared wrapping element (edges render as siblings inside the
          library's own <g>). */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        className="peer"
        style={{ pointerEvents: "stroke", cursor: "pointer" }}
        onDoubleClick={startEditing}
      />
      <path
        d={edgePath}
        fill="none"
        strokeLinecap="round"
        markerEnd={markerEnd}
        style={{ ...style, stroke: style?.stroke ?? EDGE_COLOR }}
        className={`react-flow__edge-path transition-opacity duration-150 ${
          isBright ? "opacity-100" : "opacity-60 peer-hover:opacity-100"
        }`}
        onDoubleClick={startEditing}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan nowheel absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onDoubleClick={isEditing ? undefined : startEditing}
        >
          {isEditing ? (
            <input
              autoFocus
              value={draftLabel}
              onChange={handleChange}
              onBlur={commitLabel}
              onKeyDown={handleKeyDown}
              placeholder={LABEL_PLACEHOLDER}
              style={{ width: `${Math.max(draftLabel.length, 1) + 1}ch` }}
              className="nodrag nopan nowheel rounded-full border border-surface-border bg-elevated px-2.5 py-0.5 text-center text-xs font-medium text-copy-primary outline-none placeholder:italic placeholder:text-copy-faint"
            />
          ) : label ? (
            <span className="rounded-full border border-surface-border bg-elevated px-2.5 py-0.5 text-xs font-medium text-copy-primary shadow-sm">
              {label}
            </span>
          ) : selected ? (
            <span className="rounded-full border border-surface-border-subtle px-2.5 py-0.5 text-xs italic text-copy-faint">
              {LABEL_PLACEHOLDER}
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
