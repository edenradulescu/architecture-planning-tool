"use client"

import type { CSSProperties } from "react"
import { Check } from "lucide-react"
import { NodeToolbar, Position } from "@xyflow/react"

import { NODE_COLORS } from "@/types/canvas"

type SwatchStyle = CSSProperties & { "--swatch-glow": string }

export function NodeColorToolbar({
  isVisible,
  activeColor,
  onSelectColor,
}: {
  isVisible: boolean
  activeColor: string
  onSelectColor: (fill: string) => void
}) {
  return (
    <NodeToolbar
      isVisible={isVisible}
      position={Position.Top}
      offset={14}
      className="nodrag nopan nowheel flex items-center gap-1.5 rounded-full border border-surface-border bg-elevated/95 p-1.5 shadow-lg backdrop-blur-sm"
    >
      {NODE_COLORS.map((color) => {
        const isActive = color.fill === activeColor
        return (
          <button
            key={color.fill}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${color.text} node color`}
            title={color.text}
            onClick={() => onSelectColor(color.fill)}
            style={
              {
                backgroundColor: color.fill,
                borderColor: isActive ? color.text : "var(--border-subtle)",
                "--swatch-glow": color.text,
              } as SwatchStyle
            }
            className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110 hover:shadow-[0_0_6px_0px_var(--swatch-glow)] ${
              isActive ? "border-2" : "border"
            }`}
          >
            {isActive && (
              <Check className="h-3 w-3" style={{ color: color.text }} strokeWidth={3} />
            )}
          </button>
        )
      })}
    </NodeToolbar>
  )
}
