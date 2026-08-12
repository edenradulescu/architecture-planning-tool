"use client"

import { UserButton } from "@clerk/nextjs"
import {
  Check,
  CircleAlert,
  LayoutTemplate,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
} from "lucide-react"

import type { RefObject } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CanvasSaveStatus } from "@/types/canvas"

interface WorkspaceNavbarProps {
  projectName: string
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  isAiSidebarOpen: boolean
  onToggleAiSidebar: () => void
  onOpenShare: () => void
  onOpenTemplates: () => void
  saveStatus: CanvasSaveStatus
  aiTriggerRef: RefObject<HTMLButtonElement | null>
}

const SAVE_STATUS_CONFIG: Record<
  Exclude<CanvasSaveStatus, "idle">,
  { label: string; icon: typeof Loader2; className: string }
> = {
  saving: { label: "Saving…", icon: Loader2, className: "text-copy-muted" },
  saved: { label: "Saved", icon: Check, className: "text-success" },
  error: { label: "Save failed", icon: CircleAlert, className: "text-error" },
}

function SaveStatusIndicator({ status }: { status: CanvasSaveStatus }) {
  if (status === "idle") return null

  const { label, icon: Icon, className } = SAVE_STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-surface-border-subtle px-3 py-1 text-xs font-medium",
        className
      )}
    >
      <Icon className={cn("size-3.5", status === "saving" && "animate-spin")} />
      {label}
    </span>
  )
}

export function WorkspaceNavbar({
  projectName,
  isSidebarOpen,
  onToggleSidebar,
  isAiSidebarOpen,
  onToggleAiSidebar,
  onOpenShare,
  onOpenTemplates,
  saveStatus,
  aiTriggerRef,
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
        <SaveStatusIndicator status={saveStatus} />
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenTemplates}
          className="gap-1.5 rounded-full border border-surface-border-subtle px-3 text-copy-secondary"
          aria-label="Starter templates"
        >
          <LayoutTemplate />
          Templates
        </Button>
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
          ref={aiTriggerRef}
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
