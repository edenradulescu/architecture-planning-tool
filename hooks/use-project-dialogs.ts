"use client"

import { useMemo, useState } from "react"

import { MOCK_PROJECTS } from "@/lib/mock-projects"
import { slugify } from "@/lib/slug"
import type { Project } from "@/types/project"

type DialogState =
  | { type: "create" }
  | { type: "rename"; project: Project }
  | { type: "delete"; project: Project }
  | null

function mockDelay() {
  return new Promise((resolve) => setTimeout(resolve, 400))
}

export function useProjectDialogs() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const slugPreview = useMemo(() => slugify(name), [name])

  function openCreateDialog() {
    setName("")
    setDialog({ type: "create" })
  }

  function openRenameDialog(project: Project) {
    setName(project.name)
    setDialog({ type: "rename", project })
  }

  function openDeleteDialog(project: Project) {
    setDialog({ type: "delete", project })
  }

  function closeDialog() {
    setDialog(null)
    setName("")
  }

  async function submitCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    const slug = slugify(trimmed)
    if (!slug) return
    setIsLoading(true)
    await mockDelay()
    setProjects((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: trimmed,
        slug,
        isOwner: true,
      },
    ])
    setIsLoading(false)
    closeDialog()
  }

  async function submitRename() {
    if (dialog?.type !== "rename") return
    const trimmed = name.trim()
    if (!trimmed) return
    const slug = slugify(trimmed)
    if (!slug) return
    setIsLoading(true)
    await mockDelay()
    const { project } = dialog
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id ? { ...p, name: trimmed, slug } : p
      )
    )
    setIsLoading(false)
    closeDialog()
  }

  async function submitDelete() {
    if (dialog?.type !== "delete") return
    setIsLoading(true)
    await mockDelay()
    const { project } = dialog
    setProjects((prev) => prev.filter((p) => p.id !== project.id))
    setIsLoading(false)
    closeDialog()
  }

  return {
    projects,
    dialog,
    name,
    setName,
    slugPreview,
    isLoading,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    submitCreate,
    submitRename,
    submitDelete,
  }
}

export type UseProjectDialogsReturn = ReturnType<typeof useProjectDialogs>
