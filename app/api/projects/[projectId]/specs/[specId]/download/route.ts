import { get } from "@vercel/blob"

import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; specId: string }> }
) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId, specId } = await params
  const project = await checkProjectAccess(projectId, identity.userId, identity.email)
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const spec = await prisma.projectSpec.findFirst({ where: { id: specId, projectId } })
  if (!spec) {
    return Response.json({ error: "Spec not found" }, { status: 404 })
  }

  const blob = await get(spec.filePath, { access: "private", useCache: false }).catch(() => null)
  if (!blob) {
    return Response.json({ error: "Spec not found" }, { status: 404 })
  }

  return new Response(blob.stream, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="spec-${specId}.md"`,
    },
  })
}
