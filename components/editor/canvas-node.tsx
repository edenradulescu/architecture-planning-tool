"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react"
import { Handle, NodeResizer, Position, useReactFlow } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"

import { NodeColorToolbar } from "@/components/editor/node-color-toolbar"
import {
  CONNECTION_HANDLE_COLOR,
  CYLINDER_BODY_PATH,
  CYLINDER_TOP_ELLIPSE,
  DIAMOND_POINTS,
  HEXAGON_POINTS,
  NODE_MIN_SIZE,
  type CanvasNode,
  type NodeShape,
  getNodeColorByFill,
} from "@/types/canvas"

const HANDLE_POSITIONS = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const

// Hidden by default, faded in on node hover via the parent's `group` class.
// A single "source" handle per side is enough to connect from or to any
// side — ConnectionMode.Loose (set on <ReactFlow> in canvas.tsx) drops the
// source/target type restriction entirely, so no separate target handle is
// needed to satisfy "connect from any handle to any other handle."
function NodeHandles() {
  return (
    <>
      {HANDLE_POSITIONS.map(({ id, position }) => (
        <Handle
          key={id}
          type="source"
          id={id}
          position={position}
          className="opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          style={{
            width: 8,
            height: 8,
            backgroundColor: CONNECTION_HANDLE_COLOR,
            border: "1.5px solid var(--bg-base)",
          }}
        />
      ))}
    </>
  )
}

const CSS_SHAPE_RADIUS: Record<"rectangle" | "pill" | "circle", string> = {
  rectangle: "rounded-xl",
  pill: "rounded-full",
  circle: "rounded-full",
}

const LABEL_PLACEHOLDER = "Add a label"

function ShapeSvg({
  shape,
  fill,
  stroke,
  strokeWidth,
}: {
  shape: Extract<NodeShape, "diamond" | "hexagon" | "cylinder">
  fill: string
  stroke: string
  strokeWidth: number
}) {
  if (shape === "cylinder") {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <path
          d={CYLINDER_BODY_PATH}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        <ellipse
          cx={CYLINDER_TOP_ELLIPSE.cx}
          cy={CYLINDER_TOP_ELLIPSE.cy}
          rx={CYLINDER_TOP_ELLIPSE.rx}
          ry={CYLINDER_TOP_ELLIPSE.ry}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
      <polygon
        points={shape === "diamond" ? DIAMOND_POINTS : HEXAGON_POINTS}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Grows to fit its content (instead of a fixed row count) so every typed
// character stays visible while editing — a fixed-height textarea clips
// wrapped lines once the text grows past one row. Height is recomputed
// synchronously before paint on every value change, so there's no visible
// flash between the old and new size.
function AutoSizingTextarea({
  label,
  color,
  onChange,
  onBlur,
  onKeyDown,
}: {
  label: string
  color: string
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onBlur: () => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [label])

  return (
    <textarea
      ref={ref}
      autoFocus
      rows={1}
      value={label}
      placeholder={LABEL_PLACEHOLDER}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onDoubleClick={(event) => event.stopPropagation()}
      className="nodrag nopan nowheel w-full resize-none overflow-hidden bg-transparent text-center text-sm font-medium leading-snug outline-none placeholder:italic placeholder:text-copy-faint"
      style={{ color }}
    />
  )
}

// Shared between both shape branches below so the label swaps between its
// static and editing states identically everywhere — same wrapper, same
// centering, only this inner content changes, which is what keeps the swap
// shift-free.
function NodeLabelContent({
  label,
  isEditing,
  color,
  onChange,
  onBlur,
  onKeyDown,
}: {
  label: string
  isEditing: boolean
  color: string
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onBlur: () => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
}) {
  if (isEditing) {
    return (
      <AutoSizingTextarea
        label={label}
        color={color}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    )
  }

  return (
    <span className={label ? undefined : "italic text-copy-faint"} style={label ? { color } : undefined}>
      {label || LABEL_PLACEHOLDER}
    </span>
  )
}

export function CanvasNodeRenderer({ id, data, selected }: NodeProps<CanvasNode>) {
  const { updateNodeData } = useReactFlow()
  const [isEditing, setIsEditing] = useState(false)
  const { text } = getNodeColorByFill(data.color)
  const borderColor = selected ? text : `${text}66`
  const borderWidth = selected ? 2 : 1

  const startEditing = useCallback((event: MouseEvent) => {
    event.stopPropagation()
    setIsEditing(true)
  }, [])

  const stopEditing = useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleLabelChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { label: event.target.value })
    },
    [id, updateNodeData]
  )

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.currentTarget.blur()
    }
  }, [])

  const handleSelectColor = useCallback(
    (fill: string) => {
      updateNodeData(id, { color: fill })
    },
    [id, updateNodeData]
  )

  const colorToolbar = (
    <NodeColorToolbar
      isVisible={!!selected}
      activeColor={data.color}
      onSelectColor={handleSelectColor}
    />
  )

  const resizer = (
    <NodeResizer
      isVisible={selected}
      keepAspectRatio={data.shape === "circle"}
      minWidth={NODE_MIN_SIZE.width}
      minHeight={NODE_MIN_SIZE.height}
      handleStyle={{
        width: 6,
        height: 6,
        borderRadius: 2,
        border: "1px solid var(--border-subtle)",
        backgroundColor: "var(--bg-elevated)",
      }}
      lineStyle={{ borderColor: "var(--border-subtle)" }}
    />
  )

  const label = (
    <NodeLabelContent
      label={data.label}
      isEditing={isEditing}
      color={text}
      onChange={handleLabelChange}
      onBlur={stopEditing}
      onKeyDown={handleKeyDown}
    />
  )

  if (data.shape === "diamond" || data.shape === "hexagon" || data.shape === "cylinder") {
    return (
      <div className="group relative h-full w-full">
        {colorToolbar}
        {resizer}
        <NodeHandles />
        <ShapeSvg
          shape={data.shape}
          fill={data.color}
          stroke={borderColor}
          strokeWidth={borderWidth * 1.5}
        />
        <div
          className="absolute inset-0 flex items-center justify-center px-3 text-center text-sm font-medium"
          onDoubleClick={startEditing}
        >
          {label}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group relative flex h-full w-full items-center justify-center border px-3 text-center text-sm font-medium ${CSS_SHAPE_RADIUS[data.shape]}`}
      style={{
        backgroundColor: data.color,
        borderColor,
        borderWidth,
        color: text,
      }}
      onDoubleClick={startEditing}
    >
      {colorToolbar}
      {resizer}
      <NodeHandles />
      {label}
    </div>
  )
}
