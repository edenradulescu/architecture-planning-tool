"use client"

import { UserButton } from "@clerk/nextjs"
import {
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WorkspaceNavbarProps {
  projectName: string
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  isAiSidebarOpen: boolean
  onToggleAiSidebar: () => void
  onOpenShare: () => void
}

export function WorkspaceNavbar({
  projectName,
  isSidebarOpen,
  onToggleSidebar,
  isAiSidebarOpen,
  onToggleAiSidebar,
  onOpenShare,
}: WorkspaceNavbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border-subtle bg-surface px-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>
        <div className="flex flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-copy-primary">
            {projectName}
          </span>
          <span className="text-xs text-copy-muted">Workspace</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenShare}
          className="gap-1.5 rounded-full border border-surface-border-subtle px-3 text-copy-secondary"
          aria-label="Share"
        >
          <Share2 />
          Share
        </Button>
        <Button
          size="sm"
          onClick={onToggleAiSidebar}
          aria-pressed={isAiSidebarOpen}
          aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
          className={cn(
            "gap-1.5 rounded-full bg-brand px-3 font-semibold text-page hover:bg-brand/90",
            isAiSidebarOpen && "ring-2 ring-brand/40 ring-offset-2 ring-offset-surface"
          )}
        >
          <Sparkles />
          AI
        </Button>
        <UserButton />
      </div>
    </header>
  )
}
