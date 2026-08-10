"use client"

import { usePathname, useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { slugify } from "@/lib/slug"
import type { Project } from "@/types/project"

type DialogState =
  | { type: "create" }
  | { type: "rename"; project: Project }
  | { type: "delete"; project: Project }
  | null

function generateShortSuffix(): string {
  return crypto.randomUUID().slice(0, 6)
}

export function useProjectActions() {
  const router = useRouter()
  const pathname = usePathname()

  const [dialog, setDialog] = useState<DialogState>(null)
  const [name, setName] = useState("")
  const [roomSuffix, setRoomSuffix] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const roomIdPreview = useMemo(() => {
    const slug = slugify(name)
    return slug ? `${slug}-${roomSuffix}` : ""
  }, [name, roomSuffix])

  function openCreateDialog() {
    setName("")
    setRoomSuffix(generateShortSuffix())
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

    setIsLoading(true)
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    })
    setIsLoading(false)

    if (!response.ok) return

    const { project } = (await response.json()) as { project: { id: string } }
    closeDialog()
    router.push(`/editor/${project.id}`)
    router.refresh()
  }

  async function submitRename() {
    if (dialog?.type !== "rename") return
    const trimmed = name.trim()
    if (!trimmed) return

    setIsLoading(true)
    const response = await fetch(`/api/projects/${dialog.project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    })
    setIsLoading(false)

    if (!response.ok) return

    closeDialog()
    router.refresh()
  }

  async function submitDelete() {
    if (dialog?.type !== "delete") return
    const { project } = dialog

    setIsLoading(true)
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "DELETE",
    })
    setIsLoading(false)

    if (!response.ok) return

    closeDialog()
    if (pathname === `/editor/${project.id}`) {
      router.push("/editor")
    } else {
      router.refresh()
    }
  }

  return {
    dialog,
    name,
    setName,
    roomIdPreview,
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

export type UseProjectActionsReturn = ReturnType<typeof useProjectActions>
