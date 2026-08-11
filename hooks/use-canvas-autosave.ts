"use client"

import { useEffect, useRef, useState } from "react"

import type { CanvasEdge, CanvasNode, CanvasSaveStatus } from "@/types/canvas"

const AUTOSAVE_DEBOUNCE_MS = 1500

export function useCanvasAutosave(
  roomId: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): CanvasSaveStatus {
  const [status, setStatus] = useState<CanvasSaveStatus>("idle")
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip the mount render — nothing has changed yet, so there is nothing
    // to save (also avoids an autosave firing before a saved canvas has had
    // a chance to load into the room).
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setStatus("saving")

      fetch(`/api/projects/${roomId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      })
        .then((response) => {
          setStatus(response.ok ? "saved" : "error")
        })
        .catch(() => {
          setStatus("error")
        })
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [roomId, nodes, edges])

  return status
}
