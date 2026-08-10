"use client"

import type { DragEvent } from "react"
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
} from "lucide-react"

import {
  NODE_DEFAULT_SIZES,
  NODE_SHAPES,
  type NodeShape,
  SHAPE_DRAG_MIME_TYPE,
  type ShapeDragPayload,
} from "@/types/canvas"

const SHAPE_ICONS: Record<NodeShape, typeof RectangleHorizontal> = {
  rectangle: RectangleHorizontal,
  diamond: Diamond,
  circle: Circle,
  pill: Pill,
  cylinder: Cylinder,
  hexagon: Hexagon,
}

const SHAPE_LABELS: Record<NodeShape, string> = {
  rectangle: "Rectangle",
  diamond: "Diamond",
  circle: "Circle",
  pill: "Pill",
  cylinder: "Cylinder",
  hexagon: "Hexagon",
}

function handleDragStart(
  event: DragEvent<HTMLButtonElement>,
  shape: NodeShape
) {
  const payload: ShapeDragPayload = { shape, ...NODE_DEFAULT_SIZES[shape] }
  event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, JSON.stringify(payload))
  event.dataTransfer.effectAllowed = "move"
}

export function ShapeToolbar() {
  return (
    <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-elevated/95 p-1.5 shadow-lg backdrop-blur-sm">
      {NODE_SHAPES.map((shape) => {
        const Icon = SHAPE_ICONS[shape]
        return (
          <button
            key={shape}
            type="button"
            draggable
            onDragStart={(event) => handleDragStart(event, shape)}
            aria-label={`Drag to add a ${SHAPE_LABELS[shape]} node`}
            title={SHAPE_LABELS[shape]}
            className="flex h-10 w-10 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-subtle hover:text-copy-primary active:cursor-grabbing"
          >
            <Icon className="h-5 w-5" />
          </button>
        )
      })}
    </div>
  )
}
