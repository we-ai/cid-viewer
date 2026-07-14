export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type ConceptRecord = Record<string, JsonValue>

export type ConceptIndexEntry = {
  id: string
  title: string
  terms: string[]
  variableNames: string[]
}

export type DataMetadata = {
  generatedFrom: string
  generatedAt: string
  conceptCount: number
  detailCount: number
  treeRowCount: number
}

export type ConceptIndexPayload = {
  metadata: DataMetadata
  concepts: ConceptIndexEntry[]
}

export type ConceptDetailsPayload = {
  metadata: DataMetadata
  details: Record<string, ConceptRecord>
}

export type ConceptTreeNode = {
  id: string
  title: string
  variableNames?: string[]
  children?: ConceptTreeNode[]
}

export type ConceptTreePayload = {
  metadata: DataMetadata
  tree: ConceptTreeNode
}

export type SearchMatchKind = 'cid' | 'title' | 'term' | 'variable' | 'fuzzy'

export type SearchResult = {
  concept: ConceptIndexEntry
  score: number
  kind: SearchMatchKind
  matchedText: string
}
