"use client"

import { FolderOpen, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
}

function EmptyProjectsState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <FolderOpen className="h-8 w-8 text-copy-faint" />
      <p className="text-sm text-copy-muted">{message}</p>
    </div>
  )
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
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
          className="flex flex-1 items-center justify-center"
        >
          <EmptyProjectsState message="No projects yet" />
        </TabsContent>
        <TabsContent
          value="shared"
          className="flex flex-1 items-center justify-center"
        >
          <EmptyProjectsState message="No shared projects yet" />
        </TabsContent>
      </Tabs>

      <div className="shrink-0 border-t border-surface-border-subtle p-4">
        <Button size="lg" className="w-full">
          <Plus />
          New Project
        </Button>
      </div>
    </aside>
  )
}
