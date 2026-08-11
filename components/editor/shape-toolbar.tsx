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
  CYLINDER_BODY_PATH,
  CYLINDER_TOP_ELLIPSE,
  DEFAULT_NODE_COLOR,
  DIAMOND_POINTS,
  HEXAGON_POINTS,
  NODE_DEFAULT_SIZES,
  NODE_SHAPES,
  type NodeShape,
  SHAPE_DRAG_MIME_TYPE,
  type ShapeDragPayload,
} from "@/types/canvas"

const SVG_NS = "http://www.w3.org/2000/svg"

const CSS_SHAPE_RADIUS_PX: Record<"rectangle" | "pill" | "circle", string> = {
  rectangle: "12px",
  pill: "9999px",
  circle: "9999px",
}

// Ghost preview shown attached to the cursor during a native HTML5 drag,
// built to match the node that will actually be created on drop (same
// shape + default size + default color). Uses the browser's own
// dataTransfer.setDragImage, so it already tracks the cursor and hides
// itself the instant the drag ends, whether by drop or cancel — no
// manual mouse tracking or cleanup-on-drop-cancel needed.
function createDragPreviewElement(shape: NodeShape): HTMLElement {
  const { width, height } = NODE_DEFAULT_SIZES[shape]
  const container = document.createElement("div")
  container.style.cssText = `position:fixed;top:-1000px;left:-1000px;width:${width}px;height:${height}px;pointer-events:none;`

  if (shape === "diamond" || shape === "hexagon" || shape === "cylinder") {
    const svg = document.createElementNS(SVG_NS, "svg")
    svg.setAttribute("viewBox", "0 0 100 100")
    svg.setAttribute("preserveAspectRatio", "none")
    svg.setAttribute("width", String(width))
    svg.setAttribute("height", String(height))

    if (shape === "cylinder") {
      const path = document.createElementNS(SVG_NS, "path")
      path.setAttribute("d", CYLINDER_BODY_PATH)
      path.setAttribute("fill", DEFAULT_NODE_COLOR.fill)
      path.setAttribute("stroke", DEFAULT_NODE_COLOR.text)
      path.setAttribute("stroke-width", "1.5")
      svg.appendChild(path)

      const ellipse = document.createElementNS(SVG_NS, "ellipse")
      ellipse.setAttribute("cx", String(CYLINDER_TOP_ELLIPSE.cx))
      ellipse.setAttribute("cy", String(CYLINDER_TOP_ELLIPSE.cy))
      ellipse.setAttribute("rx", String(CYLINDER_TOP_ELLIPSE.rx))
      ellipse.setAttribute("ry", String(CYLINDER_TOP_ELLIPSE.ry))
      ellipse.setAttribute("fill", DEFAULT_NODE_COLOR.fill)
      ellipse.setAttribute("stroke", DEFAULT_NODE_COLOR.text)
      ellipse.setAttribute("stroke-width", "1.5")
      svg.appendChild(ellipse)
    } else {
      const polygon = document.createElementNS(SVG_NS, "polygon")
      polygon.setAttribute("points", shape === "diamond" ? DIAMOND_POINTS : HEXAGON_POINTS)
      polygon.setAttribute("fill", DEFAULT_NODE_COLOR.fill)
      polygon.setAttribute("stroke", DEFAULT_NODE_COLOR.text)
      polygon.setAttribute("stroke-width", "1.5")
      svg.appendChild(polygon)
    }

    container.appendChild(svg)
  } else {
    container.style.backgroundColor = DEFAULT_NODE_COLOR.fill
    container.style.border = `1px solid ${DEFAULT_NODE_COLOR.text}`
    container.style.borderRadius = CSS_SHAPE_RADIUS_PX[shape]
  }

  document.body.appendChild(container)
  return container
}

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

  const { width, height } = NODE_DEFAULT_SIZES[shape]
  const preview = createDragPreviewElement(shape)
  event.dataTransfer.setDragImage(preview, width / 2, height / 2)
  window.setTimeout(() => preview.remove(), 0)
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
