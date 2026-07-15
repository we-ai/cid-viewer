import { useEffect, useRef } from 'react'
import type { ConceptIndexEntry, SearchResult } from '../types'

type SearchPanelProps = {
  exactMatch: ConceptIndexEntry | undefined
  featured: ConceptIndexEntry[]
  focusSearch: boolean
  query: string
  results: SearchResult[]
  selectedId: string | undefined
  onQueryChange: (query: string) => void
  onSelectConcept: (conceptId: string) => void
}

const kindLabels: Record<SearchResult['kind'], string> = {
  cid: 'CID',
  title: 'Title',
  term: 'Text',
  variable: 'Variable',
  fuzzy: 'Fuzzy',
}

const ResultButton = ({
  concept,
  meta,
  selected,
  onSelectConcept,
}: {
  concept: ConceptIndexEntry
  meta: string
  selected: boolean
  onSelectConcept: (conceptId: string) => void
}) => (
  <button
    type="button"
    className={`result-row${selected ? ' selected' : ''}`}
    onClick={() => onSelectConcept(concept.id)}
  >
    <span className="result-title">{concept.title}</span>
    <span className="result-meta">
      <span>{concept.id}</span>
      <span>{meta}</span>
    </span>
  </button>
)

export function SearchPanel({
  exactMatch,
  featured,
  focusSearch,
  query,
  results,
  selectedId,
  onQueryChange,
  onSelectConcept,
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const showFeatured = query.trim().length < 2

  useEffect(() => {
    if (!focusSearch) return

    inputRef.current?.focus()
    inputRef.current?.select()
  }, [focusSearch])

  return (
    <aside className="search-panel" aria-label="Concept search">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Concept dictionary</p>
          <h1>Search by Concept ID or Text</h1>
        </div>
      </div>

      <label className={`search-box${exactMatch ? ' exact-match' : ''}`}>
        <span className="search-label">Search</span>
        <input
          ref={inputRef}
          id="concept-search"
          name="concept-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="Type a CID, question text, or variable"
          autoComplete="off"
        />
      </label>

      <div className="result-list" aria-live="polite">
        {showFeatured ? (
          <>
            <p className="list-label">Starting points</p>
            {featured.map((concept) => (
              <ResultButton
                key={concept.id}
                concept={concept}
                meta="Reference"
                selected={selectedId === concept.id}
                onSelectConcept={onSelectConcept}
              />
            ))}
          </>
        ) : results.length > 0 ? (
          <>
            <p className="list-label">
              {results.length.toLocaleString()} result{results.length === 1 ? '' : 's'}
            </p>
            {results.map((result) => (
              <ResultButton
                key={`${result.concept.id}-${result.kind}`}
                concept={result.concept}
                meta={`${kindLabels[result.kind]} match: ${result.matchedText}`}
                selected={selectedId === result.concept.id}
                onSelectConcept={onSelectConcept}
              />
            ))}
          </>
        ) : (
          <div className="empty-state">
            <strong>No matches</strong>
            <span>Try a different CID, variable name, or phrase.</span>
          </div>
        )}
      </div>
    </aside>
  )
}
