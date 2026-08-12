import { randomUUID } from "node:crypto"

import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { AbortTaskRunError, logger, metadata, schemaTask } from "@trigger.dev/sdk"
import { put } from "@vercel/blob"
import { generateText } from "ai"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { chatMessageSchema } from "@/types/tasks"

const canvasNodeSchema = z.object({
  id: z.string(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  data: z
    .object({
      label: z.string().optional(),
      color: z.string().optional(),
      shape: z.string().optional(),
    })
    .optional(),
})

const canvasEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  data: z.object({ label: z.string().optional() }).optional(),
})

// Shared between the task payload and `POST /api/ai/spec`'s request body —
// the request omits `projectId`, since access is resolved server-side from
// the authenticated user + roomId and never trusted from the client (per
// feature-specs/27's "do not derive access from client-provided project
// IDs").
export const generateSpecRequestSchema = z.object({
  roomId: z.string().min(1),
  chatHistory: z.array(chatMessageSchema),
  nodes: z.array(canvasNodeSchema),
  edges: z.array(canvasEdgeSchema),
})

export const generateSpecPayloadSchema = generateSpecRequestSchema.extend({
  projectId: z.string().min(1),
})

export type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>

type CanvasNodeInput = z.infer<typeof canvasNodeSchema>
type CanvasEdgeInput = z.infer<typeof canvasEdgeSchema>
type ChatHistoryInput = z.infer<typeof chatMessageSchema>[]

function formatChatHistory(chatHistory: ChatHistoryInput): string {
  if (chatHistory.length === 0) return "(no chat history)"
  return chatHistory
    .map((message) => `${message.role === "assistant" ? "Ghost AI" : message.sender}: ${message.content}`)
    .join("\n")
}

function formatNodes(nodes: CanvasNodeInput[]): string {
  if (nodes.length === 0) return "(no nodes on the canvas)"
  return nodes
    .map((node) => `- ${node.data?.label || node.id} (id: ${node.id}, shape: ${node.data?.shape ?? "unknown"})`)
    .join("\n")
}

function formatEdges(edges: CanvasEdgeInput[], nodes: CanvasNodeInput[]): string {
  if (edges.length === 0) return "(no connections on the canvas)"
  const labelById = new Map(nodes.map((node) => [node.id, node.data?.label || node.id]))
  return edges
    .map((edge) => {
      const source = labelById.get(edge.source) ?? edge.source
      const target = labelById.get(edge.target) ?? edge.target
      const label = edge.data?.label
      return `- ${source} -> ${target}${label ? ` (${label})` : ""}`
    })
    .join("\n")
}

function buildPrompt(payload: GenerateSpecPayload): string {
  return `You are Ghost AI, a system design assistant embedded in a collaborative system architecture diagram canvas.

Write a clear, well-organized Markdown technical specification for the system the user has been designing, based on the current canvas diagram and the conversation below.

Canvas components:
${formatNodes(payload.nodes)}

Canvas connections:
${formatEdges(payload.edges, payload.nodes)}

Conversation:
${formatChatHistory(payload.chatHistory)}

Write the spec in Markdown with headings for at least: Overview, Architecture Components, and Data Flow. Add an Open Questions section only if the conversation or canvas genuinely suggests unresolved decisions. Describe each component using its label and its role inferred from context, and describe each connection as the data/control flow between components. Do not invent components or connections that aren't present in the canvas. Return only the Markdown document itself — no surrounding commentary, and no code fence wrapping the whole document.`
}

// Gemini's plain-text output for a "write this as Markdown" prompt
// frequently wraps the whole document in a ```markdown fence even when told
// not to — stripped defensively so the stored/returned content is plain
// Markdown, per this unit's "keep the task output as plain Markdown" rule.
function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  const match = trimmed.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/)
  return match ? match[1].trim() : trimmed
}

export const generateSpec = schemaTask({
  id: "generate-spec",
  schema: generateSpecPayloadSchema,
  run: async (payload, { ctx }) => {
    const runId = ctx.run.id
    const { projectId, roomId } = payload

    // Constructed inside run(), not at module scope — mirrors
    // trigger/design-agent.ts's lazy-client pattern, since eagerly
    // constructing an external SDK client at import time has already broken
    // `next build` once in this project (see progress-tracker.md's
    // 10-liveblocks-setup bugfix) for the same class of reason.
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY })

    try {
      metadata.set("status", "started").set("statusText", "Ghost AI is reading your canvas and conversation…")

      metadata.set("status", "processing").set("statusText", "Writing the spec…")

      const { text } = await generateText({
        // Same model choice as trigger/design-agent.ts — "-latest" always
        // resolves to Google's current default Flash model rather than a
        // pinned version this project's key has already been observed to
        // reject once it's sunset (see progress-tracker.md's 23-design-
        // agent-logic note).
        model: google("gemini-flash-latest"),
        prompt: buildPrompt(payload),
      })

      const spec = stripCodeFence(text)
      if (!spec) {
        throw new Error("Gemini returned an empty spec.")
      }

      // Metadata (Prisma) and content (Vercel Blob) are persisted here, right
      // after generation, rather than from a client-triggered save call — this
      // task is the only place "a spec was generated" actually happens, and
      // request handlers must stay thin per code-standards.md. Mirrors the
      // canvas-autosave blob+pointer pattern (app/api/projects/[projectId]/
      // canvas/route.ts): `access: "private"`, and the blob path embeds the
      // spec's own id so the download route (GET .../specs/[specId]/download)
      // can resolve content from `ProjectSpec.filePath` alone.
      const specId = randomUUID()
      const blob = await put(`specs/${projectId}/${specId}.md`, spec, {
        access: "private",
        contentType: "text/markdown",
        addRandomSuffix: false,
        allowOverwrite: true,
      })
      await prisma.projectSpec.create({
        data: { id: specId, projectId, filePath: blob.url },
      })

      logger.log("generate-spec completed", { runId, projectId, roomId, specId, length: spec.length })

      metadata.set("status", "complete").set("statusText", "Spec ready.")

      return { spec, specId }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong."
      logger.error("generate-spec failed", { runId, projectId, roomId, error })
      metadata.set("status", "error").set("statusText", `Ghost AI ran into a problem: ${message}`)
      throw new AbortTaskRunError(message)
    }
  },
})
