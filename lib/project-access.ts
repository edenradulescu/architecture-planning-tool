import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { findAccessibleProject } from "@/lib/projects"

export interface ClerkIdentity {
  userId: string
  email: string | null
  name: string | null
  avatarUrl: string | null
}

export async function getCurrentIdentity(): Promise<ClerkIdentity | null> {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  const email =
    user?.primaryEmailAddress?.emailAddress?.toLowerCase() ??
    user?.emailAddresses[0]?.emailAddress?.toLowerCase() ??
    null

  return { userId, email, name: user?.fullName ?? null, avatarUrl: user?.imageUrl ?? null }
}

export function checkProjectAccess(
  projectId: string,
  userId: string,
  email: string | null
) {
  return findAccessibleProject(projectId, userId, email)
}

export async function findOwnedProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })

  if (!project) {
    return {
      error: NextResponse.json({ error: "Project not found" }, { status: 404 }),
    } as const
  }

  if (project.ownerId !== userId) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const
  }

  return { project } as const
}
