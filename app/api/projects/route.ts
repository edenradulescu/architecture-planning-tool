import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ projects })
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const rawName = body && typeof body === "object" ? (body as Record<string, unknown>).name : undefined
  const name = typeof rawName === "string" && rawName.trim().length > 0 ? rawName.trim() : "Untitled Project"

  const project = await prisma.project.create({
    data: { ownerId: userId, name },
  })

  return NextResponse.json({ project }, { status: 201 })
}
