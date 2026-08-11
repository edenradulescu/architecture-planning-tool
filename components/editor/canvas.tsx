"use client"

import "@xyflow/react/dist/style.css"

import { useCallback, useEffect, useRef } from "react"
import type { DragEvent, MouseEvent as ReactMouseEvent } from "react"
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
import { useRedo, useUndo, useUpdateMyPresence } from "@liveblocks/react/suspense"

import { CanvasControlBar } from "@/components/editor/canvas-control-bar"
import { CanvasEdgeRenderer } from "@/components/editor/canvas-edge"
import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { PresenceAvatars } from "@/components/editor/presence-avatars"
import { PresenceCursors } from "@/components/editor/presence-cursors"
import { ShapeToolbar } from "@/components/editor/shape-toolbar"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { useCanvasAutosave } from "@/hooks/use-canvas-autosave"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import {
  DEFAULT_NODE_COLOR,
  EDGE_COLOR,
  EDGE_STROKE_WIDTH,
  SHAPE_DRAG_MIME_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type CanvasSaveStatus,
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
  roomId: string
  isTemplatesModalOpen: boolean
  onTemplatesModalOpenChange: (open: boolean) => void
  onSaveStatusChange: (status: CanvasSaveStatus) => void
}

function FlowCanvas({
  roomId,
  isTemplatesModalOpen,
  onTemplatesModalOpenChange,
  onSaveStatusChange,
}: FlowCanvasProps) {
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
  const updateMyPresence = useUpdateMyPresence()

  // Loads the project's last-saved canvas exactly once, and only if the
  // Liveblocks room is genuinely empty at that moment — a room that already
  // has nodes/edges (from another collaborator, or from this same load
  // already having run) is never overwritten.
  const hasAttemptedLoadRef = useRef(false)

  useEffect(() => {
    if (hasAttemptedLoadRef.current) return
    hasAttemptedLoadRef.current = true

    if (nodes.length > 0 || edges.length > 0) return

    let cancelled = false

    fetch(`/api/projects/${roomId}/canvas`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { canvas: { nodes: CanvasNode[]; edges: CanvasEdge[] } | null } | null) => {
        if (cancelled || !data?.canvas) return

        onNodesChange(
          data.canvas.nodes.map((item): NodeChange<CanvasNode> => ({ type: "add", item }))
        )
        onEdgesChange(
          data.canvas.edges.map((item): EdgeChange<CanvasEdge> => ({ type: "add", item }))
        )
      })
      .catch(() => {
        // Loading a saved canvas is best-effort — the room simply starts empty.
      })

    return () => {
      cancelled = true
    }
    // Intentionally runs once per room mount — hasAttemptedLoadRef guards
    // against re-running as nodes/edges change after the load itself lands.
  }, [roomId, nodes.length, edges.length, onNodesChange, onEdgesChange])

  const saveStatus = useCanvasAutosave(roomId, nodes, edges)
  useEffect(() => {
    onSaveStatusChange(saveStatus)
  }, [saveStatus, onSaveStatusChange])

  const handlePaneMouseMove = useCallback(
    (event: ReactMouseEvent) => {
      updateMyPresence({
        cursor: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      })
    },
    [updateMyPresence, screenToFlowPosition]
  )

  const handlePaneMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null })
  }, [updateMyPresence])
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
      // screenToFlowPosition converts the cursor's screen point (already
      // accounting for the canvas container's bounding rect and the current
      // pan/zoom) into a flow-space point under the cursor. A node's
      // `position` is its top-left corner, not its center, and the drag
      // preview (ShapeToolbar's setDragImage) is centered on the cursor
      // regardless of where within the source button it was grabbed — so
      // the node must be shifted up-and-left by half its own size for its
      // center, not its corner, to land under the cursor on drop.
      const cursorFlowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      const position = {
        x: cursorFlowPosition.x - payload.width / 2,
        y: cursorFlowPosition.y - payload.height / 2,
      }
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

      const importId = `${template.id}-${crypto.randomUUID()}`
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
        onPaneMouseMove={handlePaneMouseMove}
        onPaneMouseLeave={handlePaneMouseLeave}
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />
      </ReactFlow>
      <ShapeToolbar />
      <CanvasControlBar />
      <PresenceAvatars />
      <PresenceCursors />
      <StarterTemplatesModal
        open={isTemplatesModalOpen}
        onOpenChange={onTemplatesModalOpenChange}
        onImport={handleImportTemplate}
      />
    </div>
  )
}

interface CanvasProps {
  roomId: string
  isTemplatesModalOpen: boolean
  onTemplatesModalOpenChange: (open: boolean) => void
  onSaveStatusChange: (status: CanvasSaveStatus) => void
}

export function Canvas({
  roomId,
  isTemplatesModalOpen,
  onTemplatesModalOpenChange,
  onSaveStatusChange,
}: CanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas
        roomId={roomId}
        isTemplatesModalOpen={isTemplatesModalOpen}
        onTemplatesModalOpenChange={onTemplatesModalOpenChange}
        onSaveStatusChange={onSaveStatusChange}
      />
    </ReactFlowProvider>
  )
}
