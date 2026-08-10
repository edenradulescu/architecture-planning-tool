import { NextResponse } from "next/server"

import { addCollaborator, getCollaborators } from "@/lib/collaborators"
import { checkProjectAccess, findOwnedProject, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  const collaborators = await getCollaborators(projectId)
  return NextResponse.json({ collaborators })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const result = await findOwnedProject(projectId, identity.userId)
  if (result.error) {
    return result.error
  }

  const body = await request.json().catch(() => null)
  const rawEmail = body && typeof body === "object" ? (body as Record<string, unknown>).email : undefined
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : ""

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
  }

  const existing = await prisma.projectCollaborator.findFirst({
    where: { projectId, email },
  })
  if (existing) {
    return NextResponse.json({ error: "Already a collaborator" }, { status: 409 })
  }

  const collaborator = await addCollaborator(projectId, email)
  return NextResponse.json({ collaborator }, { status: 201 })
}
