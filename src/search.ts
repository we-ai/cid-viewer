import type { ConceptIndexEntry, ConceptTreeNode, SearchMatchKind, SearchResult } from './types'

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const compactNormalized = (value: string) => value.replaceAll(' ', '')

type PreparedSearchText = {
  compact: string
  normalized: string
  raw: string
}

type PreparedConceptSearchEntry = {
  concept: ConceptIndexEntry
  id: PreparedSearchText
  title: PreparedSearchText
  terms: PreparedSearchText[]
  variableNames: PreparedSearchText[]
}

const prepareSearchText = (value: string): PreparedSearchText => {
  const normalized = normalize(value)

  return {
    compact: compactNormalized(normalized),
    normalized,
    raw: value,
  }
}

const fuzzyScore = (queryText: string, targetText: string) => {
  if (!queryText || !targetText) return 0

  if (targetText.includes(queryText)) return queryText.length / targetText.length

  let queryIndex = 0
  let consecutive = 0
  let bestRun = 0

  for (const char of targetText) {
    if (char === queryText[queryIndex]) {
      queryIndex += 1
      consecutive += 1
      bestRun = Math.max(bestRun, consecutive)
      if (queryIndex === queryText.length) break
    } else {
      consecutive = 0
    }
  }

  if (queryIndex < queryText.length) return 0

  const coverage = queryText.length / targetText.length
  const continuity = bestRun / queryText.length
  return coverage * 0.55 + continuity * 0.45
}

const scoreText = (
  query: PreparedSearchText,
  text: PreparedSearchText,
  kind: SearchMatchKind,
): Omit<SearchResult, 'concept'> | undefined => {
  if (!query.normalized || !text.normalized) return undefined

  if (text.normalized === query.normalized) {
    return { score: kind === 'cid' ? 1000 : 860, kind, matchedText: text.raw }
  }

  if (text.normalized.startsWith(query.normalized)) {
    const baseScore = kind === 'cid' ? 940 : kind === 'title' ? 780 : 680
    return { score: baseScore - text.normalized.length / 100, kind, matchedText: text.raw }
  }

  if (text.normalized.includes(query.normalized)) {
    const baseScore = kind === 'title' ? 700 : kind === 'variable' ? 660 : 610
    return {
      score: baseScore - text.normalized.indexOf(query.normalized),
      kind,
      matchedText: text.raw,
    }
  }

  const fuzzy = fuzzyScore(query.compact, text.compact)
  if (fuzzy >= 0.52) {
    return { score: 430 * fuzzy, kind: 'fuzzy', matchedText: text.raw }
  }

  return undefined
}

const bestMatch = (query: PreparedSearchText, concept: PreparedConceptSearchEntry) => {
  let best = scoreText(query, concept.id, 'cid')
  const candidates: Array<[PreparedSearchText, SearchMatchKind]> = [[concept.title, 'title']]

  for (const name of concept.variableNames) {
    candidates.push([name, 'variable'])
  }

  for (let index = 0; index < concept.terms.length && index < 24; index += 1) {
    candidates.push([concept.terms[index], 'term'])
  }

  for (const [text, kind] of candidates) {
    const candidate = scoreText(query, text, kind)
    if (!candidate) continue
    if (!best || candidate.score > best.score) {
      best = candidate
    }
  }

  return best
}

const findUniqueExactMatch = (
  concepts: PreparedConceptSearchEntry[],
  isMatch: (concept: PreparedConceptSearchEntry) => boolean,
): ConceptIndexEntry | undefined => {
  let match: PreparedConceptSearchEntry | undefined

  for (const concept of concepts) {
    if (!isMatch(concept)) continue
    if (match && match.concept.id !== concept.concept.id) return undefined
    match = concept
  }

  return match?.concept
}

export const findExactConceptMatch = (
  query: string,
  concepts: PreparedConceptSearchEntry[],
): ConceptIndexEntry | undefined => {
  const normalizedQuery = normalize(query)

  if (normalizedQuery.length < 2) return undefined

  const exactCidMatch = concepts.find((concept) => concept.id.normalized === normalizedQuery)
  if (exactCidMatch) return exactCidMatch.concept

  const exactTitleMatch = findUniqueExactMatch(
    concepts,
    (concept) => concept.title.normalized === normalizedQuery,
  )
  if (exactTitleMatch) return exactTitleMatch

  const exactVariableMatch = findUniqueExactMatch(concepts, (concept) =>
    concept.variableNames.some((name) => name.normalized === normalizedQuery),
  )
  if (exactVariableMatch) return exactVariableMatch

  return findUniqueExactMatch(concepts, (concept) =>
    concept.terms.some((term) => term.normalized === normalizedQuery),
  )
}

export const prepareConceptSearchIndex = (
  concepts: ConceptIndexEntry[],
): PreparedConceptSearchEntry[] =>
  concepts.map((concept) => ({
    concept,
    id: prepareSearchText(concept.id),
    title: prepareSearchText(concept.title),
    terms: concept.terms.map((term) => prepareSearchText(term)),
    variableNames: concept.variableNames.map((name) => prepareSearchText(name)),
  }))

export const searchConcepts = (
  query: string,
  concepts: PreparedConceptSearchEntry[],
  limit = 80,
): SearchResult[] => {
  const trimmedQuery = query.trim()

  if (trimmedQuery.length < 2) return []

  const preparedQuery = prepareSearchText(trimmedQuery)

  return concepts
    .map((concept) => {
      const match = bestMatch(preparedQuery, concept)
      return match ? { concept: concept.concept, ...match } : undefined
    })
    .filter((result): result is SearchResult => Boolean(result))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.concept.id.localeCompare(b.concept.id)
    })
    .slice(0, limit)
}

export const getFeaturedConcepts = (
  concepts: ConceptIndexEntry[],
  treeRoot: ConceptTreeNode,
) => {
  const byId = new Map(concepts.map((concept) => [concept.id, concept]))

  return (treeRoot.children ?? []).map((node) => (
    byId.get(node.id) ?? {
      id: node.id,
      title: node.title,
      terms: [],
      variableNames: node.variableNames ?? [],
    }
  ))
}
