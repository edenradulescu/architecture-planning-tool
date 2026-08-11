"use client"

import "@xyflow/react/dist/style.css"

import { useCallback, useRef } from "react"
import type { DragEvent } from "react"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react"
import type {
  DefaultEdgeOptions,
  EdgeChange,
  EdgeTypes,
  NodeChange,
  NodeTypes,
} from "@xyflow/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { useRedo, useUndo } from "@liveblocks/react/suspense"

import { CanvasControlBar } from "@/components/editor/canvas-control-bar"
import { CanvasEdgeRenderer } from "@/components/editor/canvas-edge"
import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { ShapeToolbar } from "@/components/editor/shape-toolbar"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import {
  DEFAULT_NODE_COLOR,
  EDGE_COLOR,
  EDGE_STROKE_WIDTH,
  SHAPE_DRAG_MIME_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type ShapeDragPayload,
} from "@/types/canvas"

const nodeTypes: NodeTypes = { canvasNode: CanvasNodeRenderer }
const edgeTypes: EdgeTypes = { canvasEdge: CanvasEdgeRenderer }

// Matches CanvasControlBar/useKeyboardShortcuts' zoom-animation duration —
// used here so fitView-after-import reads as the same deliberate motion.
const FIT_VIEW_DURATION = 250

// Applied by the library to every edge that doesn't already specify these
// fields itself (both newly-drawn connections and any edge loaded without
// one) — this is what makes "new connections use the custom canvas edge
// renderer" and the default arrow/stroke style true without touching
// onConnect.
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "canvasEdge",
  data: { label: "" },
  style: { stroke: EDGE_COLOR, strokeWidth: EDGE_STROKE_WIDTH },
  markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
}

// Flow-unit gap left between existing content and an imported template, so
// the two never touch.
const IMPORT_GAP = 120

function getBoundingBox(nodesToMeasure: CanvasNode[]) {
  if (nodesToMeasure.length === 0) return null
  const xs = nodesToMeasure.flatMap((node) => [node.position.x, node.position.x + (node.width ?? 0)])
  const ys = nodesToMeasure.flatMap((node) => [node.position.y, node.position.y + (node.height ?? 0)])
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
  }
}

interface FlowCanvasProps {
  isTemplatesModalOpen: boolean
  onTemplatesModalOpenChange: (open: boolean) => void
}

function FlowCanvas({ isTemplatesModalOpen, onTemplatesModalOpenChange }: FlowCanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })
  const reactFlowInstance = useReactFlow()
  const { screenToFlowPosition, fitView } = reactFlowInstance
  const undo = useUndo()
  const redo = useRedo()
  useKeyboardShortcuts({ reactFlowInstance, undo, redo })
  // Liveblocks keys added nodes by this ID in a shared LiveMap (see
  // useLiveblocksFlow's onNodesChange -> applyNodeChanges "add" case): a
  // colliding ID from a different client reconciles into the existing node
  // instead of creating a new one, silently discarding one drop. Seeding the
  // counter from a random per-client offset (instead of every tab starting
  // at 0) keeps two users' concurrent first drops from landing on the same
  // `${shape}-${timestamp}-${counter}` key. Seeded lazily on first drop
  // (inside the event handler, not render) to keep render pure.
  const nodeCounterRef = useRef<number | null>(null)

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes(SHAPE_DRAG_MIME_TYPE)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const raw = event.dataTransfer.getData(SHAPE_DRAG_MIME_TYPE)
      if (!raw) return
      event.preventDefault()

      const payload = JSON.parse(raw) as ShapeDragPayload
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      if (nodeCounterRef.current === null) {
        nodeCounterRef.current = Math.floor(Math.random() * 1_000_000)
      }
      const id = `${payload.shape}-${Date.now()}-${nodeCounterRef.current++}`

      const newNode: CanvasNode = {
        id,
        type: "canvasNode",
        position,
        width: payload.width,
        height: payload.height,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR.fill,
          shape: payload.shape,
        },
      }

      onNodesChange([{ type: "add", item: newNode }])
    },
    [screenToFlowPosition, onNodesChange]
  )

  // Adds the template's nodes/edges alongside whatever is already on the
  // canvas, offset so the template's own bounding box sits just to the right
  // of the existing content's (top-aligned to it) instead of overlapping —
  // existing work is never touched or removed. structuredClone keeps the
  // room's live nodes/edges from ever sharing object identity with
  // CANVAS_TEMPLATES' module-level data — without it, dragging or editing an
  // imported node would mutate the shared template definition itself. IDs
  // are remapped to a per-import prefix — the template's own ids (e.g.
  // "client") are only unique within one template's definition, so importing
  // the same template twice (or the same template a second user already
  // imported) would otherwise collide and reconcile into the first copy
  // instead of creating a second one.
  const handleImportTemplate = useCallback(
    (template: CanvasTemplate) => {
      const clonedNodes = structuredClone(template.nodes)
      const clonedEdges = structuredClone(template.edges)

      const existingBounds = getBoundingBox(nodes)
      const templateBounds = getBoundingBox(clonedNodes)
      const offset =
        existingBounds && templateBounds
          ? {
              x: existingBounds.maxX + IMPORT_GAP - templateBounds.minX,
              y: existingBounds.minY - templateBounds.minY,
            }
          : { x: 0, y: 0 }

      const importId = `${template.id}-${Date.now()}`
      const idMap = new Map(clonedNodes.map((node) => [node.id, `${importId}-${node.id}`]))

      const newNodes: CanvasNode[] = clonedNodes.map((node) => ({
        ...node,
        id: idMap.get(node.id)!,
        position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
      }))
      const newEdges: CanvasEdge[] = clonedEdges.map((edge) => ({
        ...edge,
        id: `${importId}-${edge.id}`,
        source: idMap.get(edge.source)!,
        target: idMap.get(edge.target)!,
      }))

      onNodesChange(newNodes.map((item): NodeChange<CanvasNode> => ({ type: "add", item })))
      onEdgesChange(newEdges.map((item): EdgeChange<CanvasEdge> => ({ type: "add", item })))

      window.setTimeout(() => void fitView({ duration: FIT_VIEW_DURATION }), 0)
    },
    [nodes, onNodesChange, onEdgesChange, fitView]
  )

  return (
    <div
      className="relative h-full w-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        className="h-full w-full"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />
      </ReactFlow>
      <ShapeToolbar />
      <CanvasControlBar />
      <StarterTemplatesModal
        open={isTemplatesModalOpen}
        onOpenChange={onTemplatesModalOpenChange}
        onImport={handleImportTemplate}
      />
    </div>
  )
}

interface CanvasProps {
  isTemplatesModalOpen: boolean
  onTemplatesModalOpenChange: (open: boolean) => void
}

export function Canvas({ isTemplatesModalOpen, onTemplatesModalOpenChange }: CanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas
        isTemplatesModalOpen={isTemplatesModalOpen}
        onTemplatesModalOpenChange={onTemplatesModalOpenChange}
      />
    </ReactFlowProvider>
  )
}
