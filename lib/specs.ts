import { prisma } from "@/lib/prisma"
import type { ProjectSpec } from "@/types/project-spec"

// ProjectSpec has no stored filename (Prisma stores only `filePath`, the
// private Blob key) — derived here to match the exact name the download
// route already sends via Content-Disposition (trigger/generate-spec.ts,
// app/api/projects/[projectId]/specs/[specId]/download/route.ts), so the
// list and the download always agree.
export async function getProjectSpecs(projectId: string): Promise<ProjectSpec[]> {
  const rows = await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  })

  return rows.map((row) => ({
    id: row.id,
    filename: `spec-${row.id}.md`,
    createdAt: row.createdAt,
  }))
}
