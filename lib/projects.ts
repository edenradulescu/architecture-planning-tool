import { prisma } from "@/lib/prisma"
import type { Project } from "@/types/project"

export async function getOwnedProjects(userId: string): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  })

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    isOwner: true,
  }))
}

export async function getSharedProjects(email: string | null): Promise<Project[]> {
  if (!email) return []

  const projects = await prisma.project.findMany({
    where: { collaborators: { some: { email } } },
    orderBy: { createdAt: "desc" },
  })

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    isOwner: false,
  }))
}

export async function findAccessibleProject(
  projectId: string,
  userId: string,
  email: string | null
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })

  if (!project) return null
  if (project.ownerId === userId) return project

  if (email) {
    const collaborator = await prisma.projectCollaborator.findFirst({
      where: { projectId, email },
    })
    if (collaborator) return project
  }

  return null
}
