import { auth as triggerAuth } from "@trigger.dev/sdk"
import { NextResponse } from "next/server"

import { getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const runId =
    body && typeof body === "object" ? (body as Record<string, unknown>).runId : undefined

  if (typeof runId !== "string" || !runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 })
  }

  const taskRun = await prisma.taskRun.findUnique({ where: { runId } })
  if (!taskRun) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 })
  }
  if (taskRun.userId !== identity.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const token = await triggerAuth.createPublicToken({
    scopes: { read: { runs: [runId] } },
    expirationTime: "1hr",
  })

  return NextResponse.json({ token })
}
