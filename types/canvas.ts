import type { Edge, Node } from "@xyflow/react"

export type NodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon"

export const NODE_SHAPES: NodeShape[] = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
]

export interface NodeColor {
  fill: string
  text: string
}

export const NODE_COLORS: NodeColor[] = [
  { fill: "#1F1F1F", text: "#EDEDED" },
  { fill: "#10233D", text: "#52A8FF" },
  { fill: "#2E1938", text: "#BF7AF0" },
  { fill: "#331B00", text: "#FF990A" },
  { fill: "#3C1618", text: "#FF6166" },
  { fill: "#3A1726", text: "#F75F8F" },
  { fill: "#0F2E18", text: "#62C073" },
  { fill: "#062822", text: "#0AC7B4" },
]

export const DEFAULT_NODE_COLOR = NODE_COLORS[0]

export function getNodeColorByFill(fill: string): NodeColor {
  return NODE_COLORS.find((color) => color.fill === fill) ?? DEFAULT_NODE_COLOR
}

export type CanvasNodeData = {
  label: string
  color: string
  shape: NodeShape
}

export type CanvasEdgeData = {
  label: string
}

export type CanvasNode = Node<CanvasNodeData, "canvasNode">
export type CanvasEdge = Edge<CanvasEdgeData, "canvasEdge">

export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error"

// Per ui-context.md's "Edge Style" section — the single source of truth for
// the custom edge renderer's default stroke, reused by both the initial
// `defaultEdgeOptions` on <ReactFlow> and CanvasEdgeRenderer's fallback.
export const EDGE_COLOR = "#f8fafc"
export const EDGE_STROKE_WIDTH = 1.5

// "Small white dots with a dark border" per ui-context.md's Connection
// Handles section — white isn't one of the app's surface/text tokens (it's
// a canvas-specific visual constant, same category as NODE_COLORS above),
// so it's centralized here rather than inlined in the node renderer.
export const CONNECTION_HANDLE_COLOR = "#ffffff"

export interface NodeSize {
  width: number
  height: number
}

export const NODE_DEFAULT_SIZES: Record<NodeShape, NodeSize> = {
  rectangle: { width: 160, height: 80 },
  diamond: { width: 170, height: 170 },
  circle: { width: 100, height: 100 },
  pill: { width: 160, height: 56 },
  cylinder: { width: 110, height: 120 },
  hexagon: { width: 150, height: 100 },
}

// Floor applied by CanvasNodeRenderer's NodeResizer — smaller than every
// shape's default size above, so it's a real constraint without being
// tighter than any shape ever needs by default.
export const NODE_MIN_SIZE: NodeSize = { width: 48, height: 32 }

export const SHAPE_DRAG_MIME_TYPE = "application/x-ghost-shape"

export interface ShapeDragPayload {
  shape: NodeShape
  width: number
  height: number
}

// Shared SVG geometry for the shapes that can't be expressed as CSS borders.
// Both the node renderer (JSX) and the drag-preview builder (vanilla DOM)
// read from these so the two never drift apart. All defined on a 0-100
// viewBox and stretched to the node's actual size via preserveAspectRatio="none".
export const DIAMOND_POINTS = "50,2 98,50 50,98 2,50"
export const HEXAGON_POINTS = "27,3 73,3 100,50 73,97 27,97 0,50"
export const CYLINDER_BODY_PATH =
  "M 2 14 A 48 12 0 0 0 98 14 L 98 86 A 48 12 0 0 1 2 86 Z"
export const CYLINDER_TOP_ELLIPSE = { cx: 50, cy: 14, rx: 48, ry: 12 }
