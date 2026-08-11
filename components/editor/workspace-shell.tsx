"use client"

import { Bot, Sparkles } from "lucide-react"
import { useState } from "react"

import { CanvasRoom } from "@/components/editor/canvas-room"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { WorkspaceNavbar } from "@/components/editor/workspace-navbar"
import { useProjectActions } from "@/hooks/use-project-actions"
import { cn } from "@/lib/utils"
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
}: {
  roomId: string
  isSidebarOpen: boolean
  isTemplatesModalOpen: boolean
  onTemplatesModalOpenChange: (open: boolean) => void
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
      />
    </div>
  )
}

function AiSidebarPlaceholder() {
  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 border-l border-surface-border-subtle bg-surface p-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-copy-primary">
            AI Copilot
          </h2>
          <p className="text-xs text-copy-muted">Placeholder panel</p>
        </div>
        <Sparkles className="h-4 w-4 text-ai-text" />
      </div>

      <div className="flex gap-3 rounded-2xl border border-surface-border-subtle bg-elevated p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ai/20">
          <Bot className="h-4 w-4 text-ai-text" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-copy-primary">
            Chat surface pending
          </span>
          <p className="text-xs leading-relaxed text-copy-muted">
            The toggle is wired. Messaging and generation are intentionally
            out of scope here.
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-1.5 rounded-2xl border border-surface-border-subtle bg-elevated p-3">
        <span className="text-xs font-medium tracking-widest text-copy-faint uppercase">
          Future Hooks
        </span>
        <p className="text-xs leading-relaxed text-copy-muted">
          Prompt composer, run status, and architecture guidance will attach
          to this sidebar.
        </p>
      </div>
    </aside>
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
        />
        {isAiSidebarOpen && <AiSidebarPlaceholder />}
      </div>
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
