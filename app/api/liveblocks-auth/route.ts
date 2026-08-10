import { NextResponse } from "next/server"

import { getCursorColor, getLiveblocksClient } from "@/lib/liveblocks"
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"

export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const roomId = typeof body?.room === "string" ? body.room : null
  if (!roomId) {
    return NextResponse.json({ error: "Missing room" }, { status: 400 })
  }

  const project = await checkProjectAccess(roomId, identity.userId, identity.email)
  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const liveblocks = getLiveblocksClient()

  await liveblocks.getOrCreateRoom(roomId, { defaultAccesses: [] })

  const session = liveblocks.prepareSession(identity.userId, {
    userInfo: {
      name: identity.name ?? identity.email ?? identity.userId,
      avatar: identity.avatarUrl ?? "",
      color: getCursorColor(identity.userId),
    },
  })
  session.allow(roomId, session.FULL_ACCESS)

  const { status, body: responseBody } = await session.authorize()
  return new Response(responseBody, { status })
}
