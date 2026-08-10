import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { findAccessibleProject } from "@/lib/projects"

export default async function WorkspacePage({
  params,
}: PageProps<"/editor/[projectId]">) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const { projectId } = await params

  const user = await currentUser()
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null

  const project = await findAccessibleProject(projectId, userId, email)
  if (!project) redirect("/editor")

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-lg font-semibold text-copy-primary">
        {project.name}
      </h1>
      <p className="text-sm text-copy-muted">Canvas coming soon.</p>
    </div>
  )
}
