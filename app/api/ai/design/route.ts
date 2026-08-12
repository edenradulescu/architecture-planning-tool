import { auth as triggerAuth, tasks } from "@trigger.dev/sdk"
import { NextResponse } from "next/server"

import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import type { designAgent } from "@/trigger/design-agent"

export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  const { prompt, roomId, projectId } = data

  if (
    typeof prompt !== "string" ||
    !prompt.trim() ||
    typeof roomId !== "string" ||
    !roomId ||
    typeof projectId !== "string" ||
    !projectId
  ) {
    return NextResponse.json(
      { error: "prompt, roomId, and projectId are required" },
      { status: 400 }
    )
  }

  const project = await checkProjectAccess(projectId, identity.userId, identity.email)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const handle = await tasks.trigger<typeof designAgent>("design-agent", { prompt, roomId })

  const taskRun = await prisma.taskRun.create({
    data: { runId: handle.id, projectId, userId: identity.userId },
  })

  // Minted here too (same scoped-token call already used by
  // /api/ai/design/token) so the frontend can subscribe via useRealtimeRun
  // right off this response, per feature-specs/26 — that route remains for
  // any caller that only has a runId and needs a token separately.
  const publicToken = await triggerAuth.createPublicToken({
    scopes: { read: { runs: [taskRun.runId] } },
  })

  return NextResponse.json({ runId: taskRun.runId, publicToken })
}
