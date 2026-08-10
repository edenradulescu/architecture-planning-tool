"use client"

import type { NodeProps } from "@xyflow/react"

import { type CanvasNode, getNodeColorByFill } from "@/types/canvas"

export function CanvasNodeRenderer({ data }: NodeProps<CanvasNode>) {
  const { text } = getNodeColorByFill(data.color)

  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-xl border px-3 text-center text-sm font-medium"
      style={{ backgroundColor: data.color, borderColor: text, color: text }}
    >
      {data.label}
    </div>
  )
}
