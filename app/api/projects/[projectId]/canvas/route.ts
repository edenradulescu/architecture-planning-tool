import { get, put } from "@vercel/blob"
import { NextResponse } from "next/server"

import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const project = await checkProjectAccess(projectId, identity.userId, identity.email)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const nodes = body && typeof body === "object" ? (body as Record<string, unknown>).nodes : undefined
  const edges = body && typeof body === "object" ? (body as Record<string, unknown>).edges : undefined

  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return NextResponse.json({ error: "nodes and edges arrays are required" }, { status: 400 })
  }

  const blob = await put(`canvases/${projectId}.json`, JSON.stringify({ nodes, edges }), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  })

  await prisma.project.update({
    where: { id: projectId },
    data: { canvasJsonPath: blob.url },
  })

  return NextResponse.json({ url: blob.url })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const project = await checkProjectAccess(projectId, identity.userId, identity.email)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  if (!project.canvasJsonPath) {
    return NextResponse.json({ canvas: null })
  }

  const result = await get(project.canvasJsonPath, { access: "private", useCache: false }).catch(
    () => null
  )
  if (!result) {
    return NextResponse.json({ canvas: null })
  }

  const canvas = await new Response(result.stream).json()
  return NextResponse.json({ canvas })
}
