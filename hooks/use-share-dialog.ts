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
    } finally {
      setIsInviting(false)
    }
  }

  async function remove(collaboratorId: string) {
    setRemovingId(collaboratorId)
    try {
      await fetch(`/api/projects/${projectId}/collaborators/${collaboratorId}`, {
        method: "DELETE",
      })
      router.refresh()
    } finally {
      setRemovingId(null)
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/editor/${projectId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
