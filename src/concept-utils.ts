import type { ConceptRecord, ConceptTreeNode, JsonValue } from './types'

export type ConceptTreeLookup = {
  count: number
  nodesById: Map<string, ConceptTreeNode>
  parentsById: Map<string, string | undefined>
}

export const isRecord = (value: JsonValue): value is Record<string, JsonValue> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const conceptRefToId = (value: JsonValue) => {
  if (typeof value !== 'string') return undefined
  const match = value.match(/^(\d{9})(?:\.json)?$/)
  return match?.[1]
}

export const getConceptTitle = (record: ConceptRecord | undefined, fallback: string) => {
  const title =
    record?.['Current Question Text'] ??
    record?.['Question Text'] ??
    record?.['Variable Label']

  return typeof title === 'string' && title.trim() ? title : fallback
}

export const formatValue = (value: JsonValue) => {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export const collectTreePath = (
  node: ConceptTreeNode,
  targetId: string,
  path: string[] = [],
): string[] | undefined => {
  const nextPath = [...path, node.id]

  if (node.id === targetId) return nextPath

  for (const child of node.children ?? []) {
    const result = collectTreePath(child, targetId, nextPath)
    if (result) return result
  }

  return undefined
}

export const collectTreeNodePath = (
  lookup: ConceptTreeLookup,
  targetId: string,
): ConceptTreeNode[] | undefined => {
  const startNode = lookup.nodesById.get(targetId)
  if (!startNode) return undefined

  const path: ConceptTreeNode[] = []
  let currentId: string | undefined = targetId

  while (currentId) {
    const node = lookup.nodesById.get(currentId)
    if (!node) return undefined
    path.push(node)
    currentId = lookup.parentsById.get(currentId)
  }

  return path.reverse()
}

export const buildConceptTreeLookup = (root: ConceptTreeNode): ConceptTreeLookup => {
  const nodesById = new Map<string, ConceptTreeNode>()
  const parentsById = new Map<string, string | undefined>()
  let count = 0
  const stack: Array<{ node: ConceptTreeNode; parentId: string | undefined }> = [
    { node: root, parentId: undefined },
  ]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue

    count += 1
    nodesById.set(current.node.id, current.node)
    parentsById.set(current.node.id, current.parentId)

    for (const child of current.node.children ?? []) {
      stack.push({ node: child, parentId: current.node.id })
    }
  }

  return { count, nodesById, parentsById }
}
