"use client"

import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CYLINDER_BODY_PATH,
  CYLINDER_TOP_ELLIPSE,
  DIAMOND_POINTS,
  EDGE_COLOR,
  HEXAGON_POINTS,
  getNodeColorByFill,
  type CanvasEdge,
  type CanvasNode,
} from "@/types/canvas"

interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (template: CanvasTemplate) => void
}

// Padding (in flow units) added around the tightest bounding box of a
// template's nodes so shapes don't touch the preview's edge.
const PREVIEW_PADDING = 40

function getTemplateBounds(nodes: CanvasNode[]) {
  const xs = nodes.flatMap((node) => [node.position.x, node.position.x + (node.width ?? 0)])
  const ys = nodes.flatMap((node) => [node.position.y, node.position.y + (node.height ?? 0)])
  const minX = Math.min(...xs) - PREVIEW_PADDING
  const minY = Math.min(...ys) - PREVIEW_PADDING
  const maxX = Math.max(...xs) + PREVIEW_PADDING
  const maxY = Math.max(...ys) + PREVIEW_PADDING
  return { minX, minY, width: maxX - minX, height: maxY - minY }
}

function nodeCenter(node: CanvasNode) {
  return {
    x: node.position.x + (node.width ?? 0) / 2,
    y: node.position.y + (node.height ?? 0) / 2,
  }
}

// Reuses the same 0-100 viewBox shape geometry CanvasNodeRenderer and
// ShapeToolbar's drag preview already draw from (types/canvas.ts), so a
// template's preview can't visually drift from what the shape actually
// looks like once it's a real node on the canvas.
function TemplateNodeShape({ node }: { node: CanvasNode }) {
  const { fill, text } = getNodeColorByFill(node.data.color)
  const { x, y } = node.position
  const width = node.width ?? 0
  const height = node.height ?? 0

  if (node.data.shape === "diamond" || node.data.shape === "hexagon") {
    return (
      <g transform={`translate(${x} ${y}) scale(${width / 100} ${height / 100})`}>
        <polygon
          points={node.data.shape === "diamond" ? DIAMOND_POINTS : HEXAGON_POINTS}
          fill={fill}
          stroke={text}
          strokeWidth={2}
        />
      </g>
    )
  }

  if (node.data.shape === "cylinder") {
    return (
      <g transform={`translate(${x} ${y}) scale(${width / 100} ${height / 100})`}>
        <path d={CYLINDER_BODY_PATH} fill={fill} stroke={text} strokeWidth={2} strokeLinejoin="round" />
        <ellipse
          cx={CYLINDER_TOP_ELLIPSE.cx}
          cy={CYLINDER_TOP_ELLIPSE.cy}
          rx={CYLINDER_TOP_ELLIPSE.rx}
          ry={CYLINDER_TOP_ELLIPSE.ry}
          fill={fill}
          stroke={text}
          strokeWidth={2}
        />
      </g>
    )
  }

  const rx = node.data.shape === "rectangle" ? width * 0.12 : height / 2
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      fill={fill}
      stroke={text}
      strokeWidth={1.5}
      vectorEffect="non-scaling-stroke"
    />
  )
}

function TemplateEdgeLine({
  edge,
  nodesById,
}: {
  edge: CanvasEdge
  nodesById: Map<string, CanvasNode>
}) {
  const source = nodesById.get(edge.source)
  const target = nodesById.get(edge.target)
  if (!source || !target) return null

  const from = nodeCenter(source)
  const to = nodeCenter(target)

  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={EDGE_COLOR}
      strokeWidth={1.5}
      vectorEffect="non-scaling-stroke"
      opacity={0.6}
    />
  )
}

function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const bounds = getTemplateBounds(template.nodes)
  const nodesById = new Map(template.nodes.map((node) => [node.id, node]))

  return (
    <div className="h-36 w-full overflow-hidden rounded-xl border border-surface-border-subtle bg-page">
      <svg
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        {template.edges.map((edge) => (
          <TemplateEdgeLine key={edge.id} edge={edge} nodesById={nodesById} />
        ))}
        {template.nodes.map((node) => (
          <TemplateNodeShape key={node.id} node={node} />
        ))}
      </svg>
    </div>
  )
}

export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  function handleImport(template: CanvasTemplate) {
    onImport(template)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Starter templates</DialogTitle>
          <DialogDescription>
            Start from a pre-built diagram. Importing adds the template next to whatever is
            already on the canvas — nothing existing gets removed.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[28rem]">
          <div className="grid grid-cols-1 gap-3 pr-3 sm:grid-cols-2">
            {CANVAS_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="flex flex-col gap-3 rounded-2xl border border-surface-border-subtle bg-elevated p-3"
              >
                <TemplatePreview template={template} />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-copy-primary">
                    {template.name}
                  </span>
                  <p className="text-xs leading-relaxed text-copy-muted">
                    {template.description}
                  </p>
                </div>
                <Button size="sm" className="mt-auto" onClick={() => handleImport(template)}>
                  Import
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
