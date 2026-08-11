"use client"

import { useState } from "react"

import { AiSidebar } from "@/components/editor/ai-sidebar"
import { CanvasRoom } from "@/components/editor/canvas-room"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { WorkspaceNavbar } from "@/components/editor/workspace-navbar"
import { useProjectActions } from "@/hooks/use-project-actions"
import { cn } from "@/lib/utils"
import type { CanvasSaveStatus } from "@/types/canvas"
import type { Collaborator } from "@/types/collaborator"
import type { Project } from "@/types/project"

interface WorkspaceShellProps {
  roomId: string
  projectName: string
  ownedProjects: Project[]
  sharedProjects: Project[]
  isOwner: boolean
  collaborators: Collaborator[]
}

function CanvasArea({
  roomId,
  isSidebarOpen,
  isTemplatesModalOpen,
  onTemplatesModalOpenChange,
  onSaveStatusChange,
}: {
  roomId: string
  isSidebarOpen: boolean
  isTemplatesModalOpen: boolean
  onTemplatesModalOpenChange: (open: boolean) => void
  onSaveStatusChange: (status: CanvasSaveStatus) => void
}) {
  return (
    <div
      className={cn(
        "relative flex flex-1 overflow-hidden bg-page transition-[margin-left] duration-200 ease-out",
        isSidebarOpen && "lg:ml-[19.5rem]"
      )}
    >
      <CanvasRoom
        roomId={roomId}
        isTemplatesModalOpen={isTemplatesModalOpen}
        onTemplatesModalOpenChange={onTemplatesModalOpenChange}
        onSaveStatusChange={onSaveStatusChange}
      />
    </div>
  )
}

export function WorkspaceShell({
  roomId,
  projectName,
  ownedProjects,
  sharedProjects,
  isOwner,
  collaborators,
}: WorkspaceShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("idle")
  const projectActions = useProjectActions()

  return (
    <div className="flex h-svh flex-col">
      <WorkspaceNavbar
        projectName={projectName}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        isAiSidebarOpen={isAiSidebarOpen}
        onToggleAiSidebar={() => setIsAiSidebarOpen((open) => !open)}
        onOpenShare={() => setIsShareDialogOpen(true)}
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
        saveStatus={saveStatus}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        activeProjectId={roomId}
        onCreateProject={projectActions.openCreateDialog}
        onRenameProject={projectActions.openRenameDialog}
        onDeleteProject={projectActions.openDeleteDialog}
      />
      <div className="flex flex-1 overflow-hidden">
        <CanvasArea
          roomId={roomId}
          isSidebarOpen={isSidebarOpen}
          isTemplatesModalOpen={isTemplatesModalOpen}
          onTemplatesModalOpenChange={setIsTemplatesModalOpen}
          onSaveStatusChange={setSaveStatus}
        />
      </div>
      <AiSidebar
        isOpen={isAiSidebarOpen}
        onClose={() => setIsAiSidebarOpen(false)}
      />
      <ProjectDialogs state={projectActions} />
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        projectId={roomId}
        isOwner={isOwner}
        collaborators={collaborators}
      />
    </div>
  )
}
