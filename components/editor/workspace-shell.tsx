"use client"

import { useRef, useState } from "react"
import { LiveMap, LiveObject } from "@liveblocks/client"
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense"

import { AiSidebar } from "@/components/editor/ai-sidebar"
import { CanvasRoom } from "@/components/editor/canvas-room"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { WorkspaceNavbar } from "@/components/editor/workspace-navbar"
import { useProjectActions } from "@/hooks/use-project-actions"
import { cn } from "@/lib/utils"
import type { CanvasEdgeData, CanvasNodeData, CanvasSaveStatus } from "@/types/canvas"
import type { Collaborator } from "@/types/collaborator"
import type { Project } from "@/types/project"
import type { ProjectSpec } from "@/types/project-spec"

// Liveblocks only applies this the very first time a room is created — every
// later mount reads whatever's already in Storage instead. Matches the same
// "flow" shape @liveblocks/react-flow's useLiveblocksFlow would otherwise
// lazily create itself on first connect (see liveblocks.config.ts), just
// without that extra round trip.
function initialStorage() {
  return {
    flow: new LiveObject({
      nodes: new LiveMap<
        string,
        LiveObject<{
          id: string
          type: "canvasNode"
          position: { x: number; y: number }
          width: number
          height: number
          data: CanvasNodeData
        }>
      >(),
      edges: new LiveMap<
        string,
        LiveObject<{ id: string; source: string; target: string; data: CanvasEdgeData }>
      >(),
    }),
  }
}

interface WorkspaceShellProps {
  roomId: string
  projectName: string
  ownedProjects: Project[]
  sharedProjects: Project[]
  isOwner: boolean
  collaborators: Collaborator[]
  specs: ProjectSpec[]
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
  specs,
}: WorkspaceShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("idle")
  const projectActions = useProjectActions()
  const aiTriggerRef = useRef<HTMLButtonElement>(null)

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
        aiTriggerRef={aiTriggerRef}
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
      {/* One room connection shared by the canvas and the AI sidebar — the AI
          status feed and presence need the same Liveblocks room context the
          canvas already connects to, not a second connection. */}
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <RoomProvider
          id={roomId}
          initialPresence={{ cursor: null, thinking: false }}
          initialStorage={initialStorage}
        >
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
            triggerRef={aiTriggerRef}
            roomId={roomId}
            projectId={roomId}
            specs={specs}
          />
        </RoomProvider>
      </LiveblocksProvider>
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
