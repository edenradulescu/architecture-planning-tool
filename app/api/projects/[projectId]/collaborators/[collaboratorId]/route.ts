import { NextResponse } from "next/server"

import { removeCollaborator } from "@/lib/collaborators"
import { findOwnedProject, getCurrentIdentity } from "@/lib/project-access"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; collaboratorId: string }> }
) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId, collaboratorId } = await params
  const result = await findOwnedProject(projectId, identity.userId)
  if (result.error) {
    return result.error
  }

  const removed = await removeCollaborator(projectId, collaboratorId)
  if (!removed) {
    return NextResponse.json({ error: "Collaborator not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
