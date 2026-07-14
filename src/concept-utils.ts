import type { ConceptRecord, ConceptTreeNode, JsonValue } from './types'

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
  node: ConceptTreeNode,
  targetId: string,
  path: ConceptTreeNode[] = [],
): ConceptTreeNode[] | undefined => {
  const nextPath = [...path, node]

  if (node.id === targetId) return nextPath

  for (const child of node.children ?? []) {
    const result = collectTreeNodePath(child, targetId, nextPath)
    if (result) return result
  }

  return undefined
}

export const countTreeNodes = (node: ConceptTreeNode): number =>
  1 + (node.children ?? []).reduce((total, child) => total + countTreeNodes(child), 0)
