import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceShell } from "@/components/editor/workspace-shell"
import { getCollaborators } from "@/lib/collaborators"
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { getOwnedProjects, getSharedProjects } from "@/lib/projects"

export default async function WorkspacePage({
  params,
}: PageProps<"/editor/[roomId]">) {
  const identity = await getCurrentIdentity()
  if (!identity) redirect("/sign-in")

  const { roomId } = await params

  const project = await checkProjectAccess(
    roomId,
    identity.userId,
    identity.email
  )
  if (!project) return <AccessDenied />

  const [ownedProjects, sharedProjects, collaborators] = await Promise.all([
    getOwnedProjects(identity.userId),
    getSharedProjects(identity.email),
    getCollaborators(roomId),
  ])

  return (
    <WorkspaceShell
      roomId={roomId}
      projectName={project.name}
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
      isOwner={project.ownerId === identity.userId}
      collaborators={collaborators}
    />
  )
}
