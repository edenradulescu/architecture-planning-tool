"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function useShareDialog(projectId: string) {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function invite() {
    const trimmed = email.trim()
    if (!trimmed) return

    setIsInviting(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error ?? "Failed to invite collaborator")
        return
      }

      setEmail("")
      router.refresh()
    } catch {
      setError("Failed to invite collaborator")
    } finally {
      setIsInviting(false)
    }
  }

  async function remove(collaboratorId: string) {
    setRemovingId(collaboratorId)
    setError(null)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/collaborators/${collaboratorId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error ?? "Failed to remove collaborator")
        return
      }

      router.refresh()
    } catch {
      setError("Failed to remove collaborator")
    } finally {
      setRemovingId(null)
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/editor/${projectId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Failed to copy link")
    }
  }

  return {
    email,
    setEmail,
    isInviting,
    removingId,
    error,
    copied,
    invite,
    remove,
    copyLink,
  }
}

export type UseShareDialogReturn = ReturnType<typeof useShareDialog>
