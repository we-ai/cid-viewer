import type {
  ConceptIndexEntry,
  ConceptTreeNode,
  SearchMatchKind,
  SearchResult,
} from './types'

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const compact = (value: string) => normalize(value).replaceAll(' ', '')

const fuzzyScore = (query: string, target: string) => {
  if (!query || !target) return 0

  const queryText = compact(query)
  const targetText = compact(target)

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
  query: string,
  text: string,
  kind: SearchMatchKind,
): Omit<SearchResult, 'concept'> | undefined => {
  const normalizedQuery = normalize(query)
  const normalizedText = normalize(text)

  if (!normalizedQuery || !normalizedText) return undefined

  if (normalizedText === normalizedQuery) {
    return { score: kind === 'cid' ? 1000 : 860, kind, matchedText: text }
  }

  if (normalizedText.startsWith(normalizedQuery)) {
    const baseScore = kind === 'cid' ? 940 : kind === 'title' ? 780 : 680
    return { score: baseScore - normalizedText.length / 100, kind, matchedText: text }
  }

  if (normalizedText.includes(normalizedQuery)) {
    const baseScore = kind === 'title' ? 700 : kind === 'variable' ? 660 : 610
    return { score: baseScore - normalizedText.indexOf(normalizedQuery), kind, matchedText: text }
  }

  const fuzzy = fuzzyScore(query, text)
  if (fuzzy >= 0.52) {
    return { score: 430 * fuzzy, kind: 'fuzzy', matchedText: text }
  }

  return undefined
}

const bestMatch = (query: string, concept: ConceptIndexEntry) => {
  const candidates: Array<Omit<SearchResult, 'concept'> | undefined> = [
    scoreText(query, concept.id, 'cid'),
    scoreText(query, concept.title, 'title'),
    ...concept.variableNames.map((name) => scoreText(query, name, 'variable')),
    ...concept.terms.slice(0, 24).map((term) => scoreText(query, term, 'term')),
  ]

  return candidates
    .filter((candidate): candidate is Omit<SearchResult, 'concept'> => Boolean(candidate))
    .sort((a, b) => b.score - a.score)[0]
}

const findUniqueExactMatch = (
  concepts: ConceptIndexEntry[],
  isMatch: (concept: ConceptIndexEntry) => boolean,
) => {
  let match: ConceptIndexEntry | undefined

  for (const concept of concepts) {
    if (!isMatch(concept)) continue
    if (match && match.id !== concept.id) return undefined
    match = concept
  }

  return match
}

export const findExactConceptMatch = (
  query: string,
  concepts: ConceptIndexEntry[],
): ConceptIndexEntry | undefined => {
  const normalizedQuery = normalize(query)

  if (normalizedQuery.length < 2) return undefined

  const exactCidMatch = concepts.find((concept) => normalize(concept.id) === normalizedQuery)
  if (exactCidMatch) return exactCidMatch

  const exactTitleMatch = findUniqueExactMatch(
    concepts,
    (concept) => normalize(concept.title) === normalizedQuery,
  )
  if (exactTitleMatch) return exactTitleMatch

  const exactVariableMatch = findUniqueExactMatch(concepts, (concept) =>
    concept.variableNames.some((name) => normalize(name) === normalizedQuery),
  )
  if (exactVariableMatch) return exactVariableMatch

  return findUniqueExactMatch(concepts, (concept) =>
    concept.terms.some((term) => normalize(term) === normalizedQuery),
  )
}

export const searchConcepts = (
  query: string,
  concepts: ConceptIndexEntry[],
  limit = 80,
): SearchResult[] => {
  const trimmedQuery = query.trim()

  if (trimmedQuery.length < 2) return []

  return concepts
    .map((concept) => {
      const match = bestMatch(trimmedQuery, concept)
      return match ? { concept, ...match } : undefined
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
