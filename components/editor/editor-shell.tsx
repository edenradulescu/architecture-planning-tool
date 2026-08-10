"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { useProjectActions } from "@/hooks/use-project-actions"
import type { Project } from "@/types/project"

interface EditorShellProps {
  ownedProjects: Project[]
  sharedProjects: Project[]
  children: ReactNode
}

const ProjectActionsContext = createContext<{ openCreateDialog: () => void } | null>(
  null
)

export function useEditorProjectActions() {
  const context = useContext(ProjectActionsContext)
  if (!context) {
    throw new Error("useEditorProjectActions must be used within EditorShell")
  }
  return context
}

export function EditorShell({
  ownedProjects,
  sharedProjects,
  children,
}: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const projectActions = useProjectActions()

  return (
    <ProjectActionsContext.Provider
      value={{ openCreateDialog: projectActions.openCreateDialog }}
    >
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
          onCreateProject={projectActions.openCreateDialog}
          onRenameProject={projectActions.openRenameDialog}
          onDeleteProject={projectActions.openDeleteDialog}
        />
        {children}
        <ProjectDialogs state={projectActions} />
      </div>
    </ProjectActionsContext.Provider>
  )
}
