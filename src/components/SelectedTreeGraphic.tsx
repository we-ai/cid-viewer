import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import type { ConceptTreeNode } from '../types'

type SelectedTreeGraphicProps = {
  selectedId: string
  treePath: ConceptTreeNode[] | undefined
  onSelectConcept: (conceptId: string) => void
}

type GraphicNode = {
  id: string
  key: string
  parentKey?: string
  title: string
  x: number
  y: number
  role: 'ancestor' | 'selected' | 'descendant' | 'more'
}

type GraphicEdge = {
  from: string
  key: string
  to: string
}

type GraphicLayout = {
  edges: GraphicEdge[]
  height: number
  nodes: GraphicNode[]
  width: number
}

type TooltipState = {
  id: string
  title: string
  x: number
  y: number
}

const nodeWidth = 96
const nodeHeight = 34
const columnGap = 138
const rowGap = 52
const padding = 18
const maxDepth = 2
const maxChildren = 10

const buildLayout = (
  treePath: ConceptTreeNode[] | undefined,
  selectedId: string,
  expandedNodeKeys: Set<string>,
): GraphicLayout | undefined => {
  const selectedNode = treePath?.at(-1)
  if (!treePath || !selectedNode) return undefined

  let cursorY = 0
  const nodes: GraphicNode[] = []
  const edges: GraphicEdge[] = []

  const layoutSubtree = (
    node: ConceptTreeNode,
    depth: number,
    keyPath: string,
    forceLeaf = false,
  ): { centerY: number; key: string } => {
    const nodeKey = `${keyPath}-${node.id}`
    const allChildren = depth < maxDepth && !forceLeaf ? (node.children ?? []) : []
    const isExpanded = expandedNodeKeys.has(nodeKey)
    const children = isExpanded ? allChildren : allChildren.slice(0, maxChildren)
    const hiddenChildren = Math.max(allChildren.length - children.length, 0)
    const childCenters = children.map((child, index) => {
      const childLayout = layoutSubtree(
        child,
        depth + 1,
        `${nodeKey}-${index}`,
        isExpanded,
      )
      edges.push({
        from: nodeKey,
        key: `${nodeKey}-${childLayout.key}`,
        to: childLayout.key,
      })
      return childLayout.centerY
    })

    if (hiddenChildren > 0) {
      const hiddenY = cursorY
      cursorY += rowGap
      const hiddenKey = `${nodeKey}-hidden`
      nodes.push({
        id: `+${hiddenChildren}`,
        key: hiddenKey,
        parentKey: nodeKey,
        title: `Show ${hiddenChildren.toLocaleString()} additional child concept IDs.`,
        x: (depth + 1) * columnGap,
        y: hiddenY,
        role: 'more',
      })
      edges.push({
        from: nodeKey,
        key: `${nodeKey}-hidden-edge`,
        to: hiddenKey,
      })
      childCenters.push(hiddenY)
    }

    const y =
      childCenters.length > 0
        ? (Math.min(...childCenters) + Math.max(...childCenters)) / 2
        : cursorY

    if (childCenters.length === 0) cursorY += rowGap

    nodes.push({
      id: node.id,
      key: nodeKey,
      title: node.title,
      x: depth * columnGap,
      y,
      role: node.id === selectedId ? 'selected' : 'descendant',
    })

    return { centerY: y, key: nodeKey }
  }

  const selectedLayout = layoutSubtree(selectedNode, 0, 'selected')
  const selectedCenterY = selectedLayout.centerY
  const selectedDepth = treePath.length - 1

  treePath.slice(0, -1).forEach((node, index) => {
    nodes.push({
      id: node.id,
      key: `path-${node.id}-${index}`,
      title: node.title,
      x: (index - selectedDepth) * columnGap,
      y: selectedCenterY,
      role: 'ancestor',
    })

    edges.push({
      from: `path-${node.id}-${index}`,
      key: `path-edge-${node.id}-${index}`,
      to:
        index === selectedDepth - 1
          ? selectedLayout.key
          : `path-${treePath[index + 1].id}-${index + 1}`,
    })
  })

  const minX = Math.min(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  const maxX = Math.max(...nodes.map((node) => node.x))
  const maxY = Math.max(...nodes.map((node) => node.y))

  const shiftedNodes = nodes.map((node) => ({
    ...node,
    x: node.x - minX + padding,
    y: node.y - minY + padding,
  }))

  return {
    edges,
    height: maxY - minY + nodeHeight + padding * 2,
    nodes: shiftedNodes,
    width: maxX - minX + nodeWidth + padding * 2,
  }
}

export function SelectedTreeGraphic({
  selectedId,
  treePath,
  onSelectConcept,
}: SelectedTreeGraphicProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [expandedNodeKeys, setExpandedNodeKeys] = useState<Set<string>>(() => new Set())
  const [tooltip, setTooltip] = useState<TooltipState>()
  const layout = useMemo(
    () => buildLayout(treePath, selectedId, expandedNodeKeys),
    [expandedNodeKeys, selectedId, treePath],
  )

  useEffect(() => {
    setExpandedNodeKeys(new Set())
  }, [selectedId])

  const nodesByKey = useMemo(() => {
    if (!layout) return new Map<string, GraphicNode>()
    return new Map(layout.nodes.map((node) => [node.key, node]))
  }, [layout])

  const updateTooltip = (
    event: MouseEvent<SVGGElement>,
    node: GraphicNode,
  ) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    setTooltip({
      id: node.id,
      title: node.title,
      x: event.clientX - rect.left + 14,
      y: event.clientY - rect.top + 14,
    })
  }

  const activateNode = (node: GraphicNode) => {
    if (node.role === 'more') {
      if (!node.parentKey) return

      const parentKey = node.parentKey

      setExpandedNodeKeys((current) => {
        const next = new Set(current)
        next.add(parentKey)
        return next
      })
      setTooltip(undefined)
      return
    }

    onSelectConcept(node.id)
  }

  const handleKeyDown = (
    event: KeyboardEvent<SVGGElement>,
    node: GraphicNode,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activateNode(node)
    }
  }

  if (!layout) {
    return (
      <div className="empty-state compact">
        <strong>No tree placement found</strong>
        <span>This CID is available in search/details but is not present in the generated tree.</span>
      </div>
    )
  }

  return (
    <div className="selected-tree-graphic" ref={containerRef}>
      <div className="graphic-scroll" onMouseLeave={() => setTooltip(undefined)}>
        <svg
          className="tree-svg"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label="Selected concept tree structure"
        >
          <g className="tree-svg-edges">
            {layout.edges.map((edge) => {
              const from = nodesByKey.get(edge.from)
              const to = nodesByKey.get(edge.to)
              if (!from || !to) return null

              const startX = from.x + nodeWidth
              const startY = from.y + nodeHeight / 2
              const endX = to.x
              const endY = to.y + nodeHeight / 2
              const midX = (startX + endX) / 2

              return (
                <path
                  key={edge.key}
                  d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                />
              )
            })}
          </g>

          <g className="tree-svg-nodes">
            {layout.nodes.map((node) => (
              <g
                key={node.key}
                className={`tree-svg-node ${node.role}`}
                transform={`translate(${node.x}, ${node.y})`}
                role="button"
                tabIndex={0}
                aria-label={node.role === 'more' ? node.title : `${node.id}: ${node.title}`}
                onClick={() => activateNode(node)}
                onFocus={() => {
                  setTooltip({
                    id: node.id,
                    title: node.title,
                    x: node.x + 8,
                    y: node.y + nodeHeight + 10,
                  })
                }}
                onBlur={() => setTooltip(undefined)}
                onKeyDown={(event) => handleKeyDown(event, node)}
                onMouseEnter={(event) => updateTooltip(event, node)}
                onMouseMove={(event) => updateTooltip(event, node)}
              >
                <rect width={nodeWidth} height={nodeHeight} rx="6" />
                <text x={nodeWidth / 2} y={nodeHeight / 2 + 5} textAnchor="middle">
                  {node.id}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      {tooltip && (
        <div
          className="graphic-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="status"
        >
          <strong>{tooltip.id}</strong>
          <span>{tooltip.title}</span>
        </div>
      )}
    </div>
  )
}
