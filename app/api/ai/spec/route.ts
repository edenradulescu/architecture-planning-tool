import { tasks } from "@trigger.dev/sdk"
import { NextResponse } from "next/server"

import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import type { generateSpec } from "@/trigger/generate-spec"
import { generateSpecRequestSchema } from "@/trigger/generate-spec"

export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = generateSpecRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { roomId, chatHistory, nodes, edges } = parsed.data

  // Project id and Liveblocks room id are the same value in this app (see
  // progress-tracker.md's 07-wire-editor-home note) — access is resolved
  // from the authenticated user + this roomId, never from a client-supplied
  // projectId, per this unit's explicit "do not trust a client-supplied
  // projectId" rule.
  const project = await checkProjectAccess(roomId, identity.userId, identity.email)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const handle = await tasks.trigger<typeof generateSpec>("generate-spec", {
    projectId: project.id,
    roomId,
    chatHistory,
    nodes,
    edges,
  })

  const taskRun = await prisma.taskRun.create({
    data: { runId: handle.id, projectId: project.id, userId: identity.userId },
  })

  return NextResponse.json({ runId: taskRun.runId })
}
