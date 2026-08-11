"use client"

import { useEffect } from "react"
import type { ReactFlowInstance } from "@xyflow/react"

interface UseKeyboardShortcutsOptions {
  reactFlowInstance: ReactFlowInstance
  undo: () => void
  redo: () => void
}

const ZOOM_DURATION = 250

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return true
  return target.isContentEditable
}

export function useKeyboardShortcuts({
  reactFlowInstance,
  undo,
  redo,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return

      const isModifier = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (isModifier && key === "z") {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if (isModifier && key === "y") {
        event.preventDefault()
        redo()
        return
      }

      if (isModifier) return

      if (key === "+" || key === "=") {
        event.preventDefault()
        void reactFlowInstance.zoomIn({ duration: ZOOM_DURATION })
        return
      }

      if (key === "-") {
        event.preventDefault()
        void reactFlowInstance.zoomOut({ duration: ZOOM_DURATION })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [reactFlowInstance, undo, redo])
}
