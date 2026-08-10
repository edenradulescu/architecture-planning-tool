import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

async function findOwnedProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })

  if (!project) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) } as const
  }

  if (project.ownerId !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const
  }

  return { project } as const
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const result = await findOwnedProject(projectId, userId)

  if (result.error) {
    return result.error
  }

  const body = await request.json().catch(() => null)
  const rawName = body && typeof body === "object" ? (body as Record<string, unknown>).name : undefined
  const name = typeof rawName === "string" ? rawName.trim() : ""

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { name },
  })

  return NextResponse.json({ project })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const result = await findOwnedProject(projectId, userId)

  if (result.error) {
    return result.error
  }

  await prisma.project.delete({ where: { id: projectId } })

  return NextResponse.json({ success: true })
}
