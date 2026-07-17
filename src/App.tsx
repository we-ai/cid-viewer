import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { buildConceptTreeLookup, collectTreeNodePath } from './concept-utils'
import { loadConceptDetails, loadConceptShellData } from './data'
import {
  findExactConceptMatch,
  getFeaturedConcepts,
  prepareConceptSearchIndex,
  searchConcepts,
} from './search'
import { ConceptDetails } from './components/ConceptDetails'
import { SearchPanel } from './components/SearchPanel'
import type {
  ConceptDetailsPayload,
  ConceptIndexEntry,
  ConceptIndexPayload,
  ConceptTreePayload,
} from './types'

type AppShellData = {
  index: ConceptIndexPayload
  tree: ConceptTreePayload
}

const searchDebounceMs = 150

const getHashConceptId = () => {
  const hash = window.location.hash.replace('#', '').trim()
  return /^\d{9}$/.test(hash) ? hash : undefined
}

function App() {
  const [data, setData] = useState<AppShellData>()
  const [details, setDetails] = useState<ConceptDetailsPayload>()
  const [detailsError, setDetailsError] = useState<string>()
  const [error, setError] = useState<string>()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | undefined>(() => getHashConceptId())

  useEffect(() => {
    let mounted = true

    loadConceptShellData()
      .then((loadedData) => {
        if (mounted) setData(loadedData)
      })
      .catch((loadError: unknown) => {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load concept data')
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, searchDebounceMs)

    return () => {
      window.clearTimeout(handle)
    }
  }, [query])

  useEffect(() => {
    const handleHashChange = () => setSelectedId(getHashConceptId())
    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('popstate', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('popstate', handleHashChange)
    }
  }, [])

  useEffect(() => {
    if (!selectedId || details) return

    let mounted = true
    setDetailsError(undefined)

    loadConceptDetails()
      .then((payload) => {
        if (mounted) setDetails(payload)
      })
      .catch((loadError: unknown) => {
        if (mounted) {
          setDetailsError(
            loadError instanceof Error ? loadError.message : 'Unable to load concept details',
          )
        }
      })

    return () => {
      mounted = false
    }
  }, [details, selectedId])

  const conceptMap = useMemo(() => {
    if (!data) return new Map<string, ConceptIndexEntry>()
    return new Map(data.index.concepts.map((concept) => [concept.id, concept]))
  }, [data])

  const searchIndex = useMemo(
    () => (data ? prepareConceptSearchIndex(data.index.concepts) : []),
    [data],
  )

  const treeLookup = useMemo(
    () => (data ? buildConceptTreeLookup(data.tree.tree) : undefined),
    [data],
  )

  const featured = useMemo(
    () => (data ? getFeaturedConcepts(data.index.concepts, data.tree.tree) : []),
    [data],
  )

  const results = useMemo(
    () => searchConcepts(debouncedQuery, searchIndex),
    [debouncedQuery, searchIndex],
  )
  const exactMatch = useMemo(
    () => findExactConceptMatch(debouncedQuery, searchIndex),
    [debouncedQuery, searchIndex],
  )

  const selectedConcept = selectedId ? conceptMap.get(selectedId) : undefined
  const selectedRecord = selectedId ? details?.details[selectedId] : undefined
  const selectedPath = useMemo(
    () => (treeLookup && selectedId ? collectTreeNodePath(treeLookup, selectedId) : undefined),
    [selectedId, treeLookup],
  )
  const treeNodeCount = treeLookup?.count ?? 0

  const selectConcept = useCallback((conceptId: string, options: { syncQuery?: boolean } = {}) => {
    if (conceptId === 'root') {
      return
    }

    if (options.syncQuery ?? true) {
      setQuery(conceptId)
    }

    setSelectedId(conceptId)
    if (window.location.hash !== `#${conceptId}`) {
      window.history.pushState(null, '', `#${conceptId}`)
    }
  }, [])

  useEffect(() => {
    if (exactMatch?.id) {
      selectConcept(exactMatch.id, { syncQuery: false })
    }
  }, [exactMatch?.id, selectConcept])

  if (error) {
    return (
      <main className="app-shell">
        <section className="load-state error-state">
          <p className="eyebrow">Concept viewer</p>
          <h1>Data failed to load</h1>
          <p>{error}</p>
        </section>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="app-shell">
        <section className="load-state">
          <p className="eyebrow">Concept viewer</p>
          <h1>Loading concept dictionary</h1>
          <p>Preparing search, details, and hierarchy data.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <h1 className="app-title">CID Viewer</h1>

      <header className="top-bar" aria-label="Concept data summary">
        <dl>
          <div>
            <dt>Concepts</dt>
            <dd>{data.index.metadata.conceptCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Details</dt>
            <dd>{data.index.metadata.detailCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Tree nodes</dt>
            <dd>{treeNodeCount.toLocaleString()}</dd>
          </div>
        </dl>
      </header>

      <div className="workspace">
        <SearchPanel
          featured={featured}
          exactMatch={exactMatch}
          focusSearch={!selectedId}
          query={query}
          results={results}
          selectedId={selectedId}
          onQueryChange={setQuery}
          onSelectConcept={selectConcept}
        />
        <ConceptDetails
          concept={selectedConcept}
          detailsById={details?.details ?? {}}
          detailsStatus={
            details
              ? 'ready'
              : detailsError
                ? 'error'
                : selectedId
                  ? 'loading'
                  : 'idle'
          }
          detailsError={detailsError}
          record={selectedRecord}
          treePath={selectedPath}
          onSelectConcept={selectConcept}
        />
      </div>
    </main>
  )
}

export default App
