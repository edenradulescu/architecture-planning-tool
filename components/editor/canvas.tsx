"use client"

import "@xyflow/react/dist/style.css"

import { useCallback, useRef } from "react"
import type { DragEvent } from "react"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react"
import type { NodeTypes } from "@xyflow/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"

import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { ShapeToolbar } from "@/components/editor/shape-toolbar"
import {
  DEFAULT_NODE_COLOR,
  SHAPE_DRAG_MIME_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type ShapeDragPayload,
} from "@/types/canvas"

const nodeTypes: NodeTypes = { canvasNode: CanvasNodeRenderer }

function FlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })
  const { screenToFlowPosition } = useReactFlow()
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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />
        <MiniMap />
      </ReactFlow>
      <ShapeToolbar />
    </div>
  )
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  )
}
