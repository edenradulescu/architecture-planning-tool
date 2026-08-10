"use client"

import { useMemo, useState } from "react"

import { EditorHome } from "@/components/editor/editor-home"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { useProjectDialogs } from "@/hooks/use-project-dialogs"

export default function EditorPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const projectDialogs = useProjectDialogs()

  const ownedProjects = useMemo(
    () => projectDialogs.projects.filter((project) => project.isOwner),
    [projectDialogs.projects]
  )
  const sharedProjects = useMemo(
    () => projectDialogs.projects.filter((project) => !project.isOwner),
    [projectDialogs.projects]
  )

  return (
    <div className="flex flex-1 flex-col">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        onCreateProject={projectDialogs.openCreateDialog}
        onRenameProject={projectDialogs.openRenameDialog}
        onDeleteProject={projectDialogs.openDeleteDialog}
      />
      <EditorHome onCreateProject={projectDialogs.openCreateDialog} />
      <ProjectDialogs state={projectDialogs} />
    </div>
  )
}
