import { redirect } from "next/navigation"

import { EditorShell } from "@/components/editor/editor-shell"
import { getCurrentIdentity } from "@/lib/project-access"
import { getOwnedProjects, getSharedProjects } from "@/lib/projects"

export default async function EditorLayout({ children }: LayoutProps<"/editor">) {
  const identity = await getCurrentIdentity()
  if (!identity) redirect("/sign-in")

  const [ownedProjects, sharedProjects] = await Promise.all([
    getOwnedProjects(identity.userId),
    getSharedProjects(identity.email),
  ])

  return (
    <EditorShell ownedProjects={ownedProjects} sharedProjects={sharedProjects}>
      {children}
    </EditorShell>
  )
}
