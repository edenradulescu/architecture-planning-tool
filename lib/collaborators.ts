import { clerkClient } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"
import type { Collaborator } from "@/types/collaborator"

async function enrichCollaborators(
  rows: { id: string; email: string }[]
): Promise<Collaborator[]> {
  if (rows.length === 0) return []

  const client = await clerkClient()
  const { data: users } = await client.users.getUserList({
    emailAddress: rows.map((row) => row.email),
  })

  const userByEmail = new Map(
    users.flatMap((user) =>
      user.emailAddresses.map(
        (emailAddress) => [emailAddress.emailAddress, user] as const
      )
    )
  )

  return rows.map((row) => {
    const user = userByEmail.get(row.email)
    return {
      id: row.id,
      email: row.email,
      name: user?.fullName ?? null,
      avatarUrl: user?.imageUrl ?? null,
    }
  })
}

export async function getCollaborators(projectId: string): Promise<Collaborator[]> {
  const rows = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  })

  return enrichCollaborators(rows)
}

export async function addCollaborator(
  projectId: string,
  email: string
): Promise<Collaborator> {
  const row = await prisma.projectCollaborator.create({
    data: { projectId, email },
  })

  const [enriched] = await enrichCollaborators([row])
  return enriched
}

export async function removeCollaborator(
  projectId: string,
  collaboratorId: string
): Promise<boolean> {
  const result = await prisma.projectCollaborator.deleteMany({
    where: { id: collaboratorId, projectId },
  })

  return result.count > 0
}
