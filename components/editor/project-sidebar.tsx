"use client"

import { FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { Project } from "@/types/project"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  ownedProjects: Project[]
  sharedProjects: Project[]
  onCreateProject: () => void
  onRenameProject: (project: Project) => void
  onDeleteProject: (project: Project) => void
  activeProjectId?: string
}

function EmptyProjectsState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <FolderOpen className="h-8 w-8 text-copy-faint" />
      <p className="text-sm text-copy-muted">{message}</p>
    </div>
  )
}

function ProjectListItem({
  project,
  isActive,
  onRename,
  onDelete,
}: {
  project: Project
  isActive?: boolean
  onRename?: (project: Project) => void
  onDelete?: (project: Project) => void
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border border-transparent px-2.5 py-2 hover:bg-subtle",
        isActive && "border-brand/30 bg-accent-dim"
      )}
    >
      <span
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 truncate text-sm text-copy-secondary",
          isActive && "font-medium text-copy-primary"
        )}
      >
        {isActive && (
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
          />
        )}
        <span className="truncate">{project.name}</span>
      </span>
      {project.isOwner && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Rename ${project.name}`}
            onClick={() => onRename?.(project)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Delete ${project.name}`}
            onClick={() => onDelete?.(project)}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  )
}

export function ProjectSidebar({
  isOpen,
  onClose,
  ownedProjects,
  sharedProjects,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  activeProjectId,
}: ProjectSidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}
      <aside
        aria-hidden={!isOpen}
        className={cn(
          "fixed top-[4.25rem] bottom-3 left-3 z-40 flex w-72 flex-col overflow-hidden rounded-2xl border border-surface-border bg-elevated/95 shadow-2xl backdrop-blur-sm transition-transform duration-200 ease-out",
          isOpen
            ? "translate-x-0"
            : "pointer-events-none -translate-x-[calc(100%+0.75rem)]"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-surface-border-subtle px-4 py-3">
          <h2 className="text-sm font-semibold text-copy-primary">Projects</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X />
          </Button>
        </div>

        <Tabs
          defaultValue="my-projects"
          className="flex flex-1 flex-col overflow-hidden px-4 py-3"
        >
          <TabsList className="w-full">
            <TabsTrigger value="my-projects" className="flex-1">
              My Projects
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex-1">
              Shared
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="my-projects"
            className="flex flex-1 flex-col overflow-y-auto"
          >
            {ownedProjects.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <EmptyProjectsState message="No projects yet" />
              </div>
            ) : (
              <div className="flex flex-col gap-1 py-1">
                {ownedProjects.map((project) => (
                  <ProjectListItem
                    key={project.id}
                    project={project}
                    isActive={project.id === activeProjectId}
                    onRename={onRenameProject}
                    onDelete={onDeleteProject}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent
            value="shared"
            className="flex flex-1 flex-col overflow-y-auto"
          >
            {sharedProjects.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <EmptyProjectsState message="No shared projects yet" />
              </div>
            ) : (
              <div className="flex flex-col gap-1 py-1">
                {sharedProjects.map((project) => (
                  <ProjectListItem
                    key={project.id}
                    project={project}
                    isActive={project.id === activeProjectId}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="shrink-0 border-t border-surface-border-subtle p-4">
          <Button
            size="lg"
            className="w-full rounded-full bg-brand text-page hover:bg-brand/90"
            onClick={onCreateProject}
          >
            <Plus />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}
