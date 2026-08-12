import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { AbortTaskRunError, logger, task } from "@trigger.dev/sdk"
import { generateObject } from "ai"
import { z } from "zod"
import type { Liveblocks } from "@liveblocks/node"
import { LiveObject } from "@liveblocks/node"

import { AI_AGENT_COLOR, AI_AGENT_NAME, AI_AGENT_USER_ID, getLiveblocksClient } from "@/lib/liveblocks"
import {
  DEFAULT_NODE_COLOR,
  NODE_COLORS,
  NODE_DEFAULT_SIZES,
  NODE_MIN_SIZE,
  NODE_SHAPES,
  type NodeShape,
} from "@/types/canvas"
import type { AiStatusFeedStatus } from "@/types/tasks"

export interface DesignAgentPayload {
  prompt: string
  roomId: string
}

// Flow-unit gap left between a run's existing canvas content and the AI's
// new nodes — same convention canvas.tsx's starter-template import already
// uses (IMPORT_GAP) to keep new content from ever landing on top of
// existing work.
const NEW_CONTENT_GAP = 120

const NODE_COLOR_FILLS = NODE_COLORS.map((color) => color.fill) as [string, ...string[]]
const NODE_SHAPE_VALUES = NODE_SHAPES as [NodeShape, ...NodeShape[]]

// Seven separate, homogeneous action arrays rather than one polymorphic
// "actions" array keyed by a discriminant. Two earlier attempts both failed
// live against this project's actual Gemini key: a zod discriminatedUnion
// made structured output fail outright ("response did not match schema"),
// and a flat single-shape object (every field but "id" optional, relevance
// explained only in prose) made the model reliably omit required fields
// (e.g. add_node entries with no "color") since it had to infer per-action
// requiredness from field descriptions rather than the schema itself. A
// separate array per action keeps every field in it genuinely required
// (except where the action itself is optional, e.g. a label), which is what
// finally produced reliable output.
const addNodeSchema = z.object({
  id: z.string().describe("A new, short, unique kebab-case id you invent, e.g. 'user-service'."),
  label: z.string(),
  shape: z.enum(NODE_SHAPE_VALUES),
  color: z.enum(NODE_COLOR_FILLS),
  x: z.number(),
  y: z.number(),
})

const moveNodeSchema = z.object({
  id: z.string().describe("The exact id of an existing node to reposition."),
  x: z.number(),
  y: z.number(),
})

const resizeNodeSchema = z.object({
  id: z.string().describe("The exact id of an existing node to resize."),
  width: z.number(),
  height: z.number(),
})

const updateNodeDataSchema = z.object({
  id: z.string().describe("The exact id of an existing node to relabel and/or recolor."),
  label: z.string().optional(),
  color: z.enum(NODE_COLOR_FILLS).optional(),
})

const deleteNodeSchema = z.object({
  id: z.string().describe("The exact id of an existing node to remove."),
})

const addEdgeSchema = z.object({
  id: z.string().describe("A new, short, unique kebab-case id you invent for this edge."),
  source: z
    .string()
    .describe("The id of the source node — either an existing node id, or one of this response's own new node ids."),
  target: z
    .string()
    .describe("The id of the target node — either an existing node id, or one of this response's own new node ids."),
  label: z.string().optional(),
})

const deleteEdgeSchema = z.object({
  id: z.string().describe("The exact id of an existing edge to remove."),
})

const designResponseSchema = z.object({
  summary: z
    .string()
    .describe("One short, plain-English sentence describing what changed, for a chat status feed."),
  addNodes: z.array(addNodeSchema),
  moveNodes: z.array(moveNodeSchema),
  resizeNodes: z.array(resizeNodeSchema),
  updateNodeData: z.array(updateNodeDataSchema),
  deleteNodes: z.array(deleteNodeSchema),
  addEdges: z.array(addEdgeSchema),
  deleteEdges: z.array(deleteEdgeSchema),
})

type DesignResponse = z.infer<typeof designResponseSchema>

interface ExistingNode {
  id: string
  label: string
  shape: string
  color: string
  x: number
  y: number
  width: number
  height: number
}

interface ExistingEdge {
  id: string
  source: string
  target: string
  label: string
}

interface RawStorageNode {
  id: string
  position?: { x: number; y: number }
  width?: number
  height?: number
  data?: { label?: string; color?: string; shape?: string }
}

interface RawStorageEdge {
  id: string
  source: string
  target: string
  data?: { label?: string }
}

function buildPrompt(prompt: string, existingNodes: ExistingNode[], existingEdges: ExistingEdge[]): string {
  return `You are Ghost AI, a system design assistant embedded in a collaborative, real-time system architecture diagram canvas.

The user asked:
"""
${prompt}
"""

Current canvas state (JSON) — existing nodes and edges you can extend, move, restyle, connect, or remove:
nodes: ${JSON.stringify(existingNodes)}
edges: ${JSON.stringify(existingEdges)}

Return the changes needed to satisfy the request, split into the appropriate arrays (addNodes, moveNodes, resizeNodes, updateNodeData, deleteNodes, addEdges, deleteEdges) — leave an array empty if you don't need that kind of change. Rules:
- Only use these node shapes: ${NODE_SHAPE_VALUES.join(", ")}. Use "cylinder" for databases/storage, "hexagon" for external systems or boundaries, "diamond" for decisions or gateways, "circle" for events or endpoints, "pill" for services or processes, "rectangle" as a general-purpose default.
- Only use these exact hex values for a node's "color": ${NODE_COLOR_FILLS.join(", ")}. Use color to group related nodes by tier or domain (e.g. all data stores the same color), not randomly.
- Lay new nodes out left-to-right and top-to-bottom, reflecting the logical flow of the system (e.g. client -> gateway -> services -> storage). Space nodes at least 200 units apart horizontally and 140 units apart vertically so they never overlap each other. Start new coordinates near (0, 0) — final placement on the shared canvas is handled separately.
- Reference existing nodes by their exact existing "id" when moving, resizing, updating, deleting, or connecting them. Only invent new ids (short, kebab-case) for nodes you add in this response, and use those same new ids if you also add edges to/from them.
- Prefer extending the existing diagram over recreating it, unless the user explicitly asks to start over or remove something.
- Keep "summary" to one short, plain-English sentence describing what changed, written for a status feed all collaborators will see.
- If the request doesn't require any canvas change, leave every array empty and explain why in "summary".`
}

function boundingBox(boxes: Array<{ x: number; y: number; width: number; height: number }>) {
  if (boxes.length === 0) return null
  const xs = boxes.flatMap((box) => [box.x, box.x + box.width])
  const ys = boxes.flatMap((box) => [box.y, box.y + box.height])
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs) }
}

async function readCanvasContext(
  liveblocks: Liveblocks,
  roomId: string
): Promise<{ existingNodes: ExistingNode[]; existingEdges: ExistingEdge[] }> {
  try {
    const doc = (await liveblocks.getStorageDocument(roomId, "json")) as {
      flow?: { nodes?: Record<string, RawStorageNode>; edges?: Record<string, RawStorageEdge> }
    }
    const existingNodes: ExistingNode[] = Object.values(doc.flow?.nodes ?? {}).map((node) => ({
      id: node.id,
      label: node.data?.label ?? "",
      shape: node.data?.shape ?? "rectangle",
      color: node.data?.color ?? DEFAULT_NODE_COLOR.fill,
      x: node.position?.x ?? 0,
      y: node.position?.y ?? 0,
      width: node.width ?? NODE_DEFAULT_SIZES.rectangle.width,
      height: node.height ?? NODE_DEFAULT_SIZES.rectangle.height,
    }))
    const existingEdges: ExistingEdge[] = Object.values(doc.flow?.edges ?? {}).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.data?.label ?? "",
    }))
    return { existingNodes, existingEdges }
  } catch (error) {
    logger.warn("design-agent: failed to read existing canvas, continuing with an empty context", {
      error,
    })
    return { existingNodes: [], existingEdges: [] }
  }
}

// Applies the model's actions to the room's shared Liveblocks Storage — the
// same "flow" LiveMap structure @liveblocks/react-flow's useLiveblocksFlow
// reads and writes client-side (see liveblocks.config.ts), so every
// connected client sees these changes the instant they're applied, through
// the existing collaborative canvas state rather than a side channel.
async function applyDesignActions(
  liveblocks: Liveblocks,
  roomId: string,
  response: DesignResponse,
  existingNodes: ExistingNode[],
  runId: string
): Promise<{ applied: number; cursorTarget: { x: number; y: number } | null }> {
  const { addNodes, moveNodes, resizeNodes, updateNodeData, deleteNodes, addEdges, deleteEdges } = response

  const existingBounds = boundingBox(existingNodes)
  const newBounds = boundingBox(
    addNodes.map((node) => ({ x: node.x, y: node.y, ...NODE_DEFAULT_SIZES[node.shape] }))
  )
  const offset =
    existingBounds && newBounds
      ? { x: existingBounds.maxX + NEW_CONTENT_GAP - newBounds.minX, y: existingBounds.minY - newBounds.minY }
      : { x: 0, y: 0 }

  const idMap = new Map<string, string>(addNodes.map((node) => [node.id, `ai-${runId}-${node.id}`]))
  const existingIds = new Set(existingNodes.map((node) => node.id))

  function resolveNodeId(id: string): string | null {
    return idMap.get(id) ?? (existingIds.has(id) ? id : null)
  }

  let applied = 0
  let cursorTarget: { x: number; y: number } | null = null

  await liveblocks.mutateStorage(roomId, ({ root }) => {
    // Reset on every invocation — mutateStorage may retry this callback on
    // an optimistic-concurrency conflict, and only the invocation that
    // actually commits should be reflected in the outer counters.
    applied = 0
    cursorTarget = null

    const flow = root.get("flow")
    const nodesMap = flow.get("nodes")
    const edgesMap = flow.get("edges")

    for (const node of addNodes) {
      const id = idMap.get(node.id)!
      const size = NODE_DEFAULT_SIZES[node.shape]
      const position = { x: node.x + offset.x, y: node.y + offset.y }
      nodesMap.set(
        id,
        new LiveObject({
          id,
          type: "canvasNode",
          position,
          width: size.width,
          height: size.height,
          data: { label: node.label, color: node.color, shape: node.shape },
        })
      )
      cursorTarget = { x: position.x + size.width / 2, y: position.y + size.height / 2 }
      applied++
    }

    for (const move of moveNodes) {
      const id = resolveNodeId(move.id)
      const node = id ? nodesMap.get(id) : undefined
      if (!node) continue
      const position = idMap.has(move.id)
        ? { x: move.x + offset.x, y: move.y + offset.y }
        : { x: move.x, y: move.y }
      node.set("position", position)
      applied++
    }

    for (const resize of resizeNodes) {
      const id = resolveNodeId(resize.id)
      const node = id ? nodesMap.get(id) : undefined
      if (!node) continue
      node.set("width", Math.max(resize.width, NODE_MIN_SIZE.width))
      node.set("height", Math.max(resize.height, NODE_MIN_SIZE.height))
      applied++
    }

    for (const update of updateNodeData) {
      const id = resolveNodeId(update.id)
      const node = id ? nodesMap.get(id) : undefined
      if (!node) continue
      const data = node.get("data")
      node.set("data", {
        ...data,
        ...(update.label !== undefined ? { label: update.label } : {}),
        ...(update.color !== undefined ? { color: update.color } : {}),
      })
      applied++
    }

    for (const del of deleteNodes) {
      const id = resolveNodeId(del.id)
      if (!id) continue
      nodesMap.delete(id)
      applied++
    }

    for (const edge of addEdges) {
      const source = resolveNodeId(edge.source)
      const target = resolveNodeId(edge.target)
      if (!source || !target) continue
      const id = `ai-${runId}-${edge.id}`
      edgesMap.set(id, new LiveObject({ id, source, target, data: { label: edge.label ?? "" } }))
      applied++
    }

    for (const del of deleteEdges) {
      edgesMap.delete(del.id)
      applied++
    }
  })

  return { applied, cursorTarget }
}

export const designAgent = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload, { ctx }) => {
    const { prompt, roomId } = payload
    const runId = ctx.run.id
    const liveblocks = getLiveblocksClient()
    // Constructed inside run(), not at module scope — mirrors
    // lib/liveblocks.ts's lazy-client pattern, since eagerly constructing an
    // external SDK client at import time has already broken `next build`
    // once in this project (see progress-tracker.md's 10-liveblocks-setup
    // bugfix) for the same class of reason.
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY })

    async function publishStatus(status: AiStatusFeedStatus, text: string) {
      try {
        await liveblocks.broadcastEvent(roomId, { type: "ai-status-feed", status, text, runId })
      } catch (error) {
        // A failed status broadcast is not worth failing the whole run over.
        logger.warn("design-agent: failed to broadcast status", { status, error })
      }
    }

    async function setAiPresence(thinking: boolean, cursor: { x: number; y: number } | null, ttl?: number) {
      try {
        await liveblocks.setPresence(roomId, {
          userId: AI_AGENT_USER_ID,
          data: { cursor, thinking },
          userInfo: { name: AI_AGENT_NAME, avatar: "", color: AI_AGENT_COLOR },
          ttl,
        })
      } catch (error) {
        logger.warn("design-agent: failed to set AI presence", { error })
      }
    }

    try {
      await setAiPresence(true, null)
      await publishStatus("started", "Ghost AI is reading your request…")

      const { existingNodes, existingEdges } = await readCanvasContext(liveblocks, roomId)

      await publishStatus("processing", "Designing your architecture…")

      const { object } = await generateObject({
        // "-latest" always resolves to Google's current default Flash model,
        // rather than a pinned version number that can be sunset out from
        // under this project without warning (confirmed live: this key's
        // project already rejects "gemini-2.5-flash" as "no longer
        // available to new users", even though it's still listed by the
        // models.list API).
        model: google("gemini-flash-latest"),
        schema: designResponseSchema,
        prompt: buildPrompt(prompt, existingNodes, existingEdges),
      })

      const requested =
        object.addNodes.length +
        object.moveNodes.length +
        object.resizeNodes.length +
        object.updateNodeData.length +
        object.deleteNodes.length +
        object.addEdges.length +
        object.deleteEdges.length

      const { applied, cursorTarget } = await applyDesignActions(
        liveblocks,
        roomId,
        object,
        existingNodes,
        runId
      )
      if (cursorTarget) {
        await setAiPresence(true, cursorTarget)
      }

      logger.log("design-agent applied actions", { runId, roomId, requested, applied })

      const summary = object.summary.trim() || "Updated the canvas."
      await publishStatus("complete", summary)

      return { summary, actionsRequested: requested, actionsApplied: applied }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong."
      logger.error("design-agent failed", { runId, roomId, error })
      await publishStatus("error", `Ghost AI ran into a problem: ${message}`)
      // Aborted, not retried: a retry would re-read the (now already
      // partially mutated) canvas and could double-apply changes that
      // succeeded before the failure.
      throw new AbortTaskRunError(message)
    } finally {
      // Short TTL (Liveblocks' minimum) rather than deleting the presence
      // entry outright — the SDK has no explicit "clear presence" call, so
      // this is what "clear AI presence when the task finishes" resolves to.
      await setAiPresence(false, null, 2)
    }
  },
})
