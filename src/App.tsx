import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { collectTreeNodePath, countTreeNodes } from './concept-utils'
import { loadConceptData } from './data'
import { getFeaturedConcepts, searchConcepts } from './search'
import { ConceptDetails } from './components/ConceptDetails'
import { SearchPanel } from './components/SearchPanel'
import type {
  ConceptDetailsPayload,
  ConceptIndexEntry,
  ConceptIndexPayload,
  ConceptTreePayload,
} from './types'

type AppData = {
  details: ConceptDetailsPayload
  index: ConceptIndexPayload
  tree: ConceptTreePayload
}

const getHashConceptId = () => {
  const hash = window.location.hash.replace('#', '').trim()
  return /^\d{9}$/.test(hash) ? hash : undefined
}

function App() {
  const [data, setData] = useState<AppData>()
  const [error, setError] = useState<string>()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | undefined>(() => getHashConceptId())

  useEffect(() => {
    let mounted = true

    loadConceptData()
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
    const handleHashChange = () => setSelectedId(getHashConceptId())
    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('popstate', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('popstate', handleHashChange)
    }
  }, [])

  const conceptMap = useMemo(() => {
    if (!data) return new Map<string, ConceptIndexEntry>()
    return new Map(data.index.concepts.map((concept) => [concept.id, concept]))
  }, [data])

  const featured = useMemo(
    () => (data ? getFeaturedConcepts(data.index.concepts, data.tree.tree) : []),
    [data],
  )

  const results = useMemo(
    () => (data ? searchConcepts(query, data.index.concepts) : []),
    [data, query],
  )

  const selectedConcept = selectedId ? conceptMap.get(selectedId) : undefined
  const selectedRecord = selectedId ? data?.details.details[selectedId] : undefined
  const selectedPath = useMemo(
    () => (data && selectedId ? collectTreeNodePath(data.tree.tree, selectedId) : undefined),
    [data, selectedId],
  )
  const treeNodeCount = useMemo(
    () => (data ? countTreeNodes(data.tree.tree) : 0),
    [data],
  )

  const selectConcept = useCallback((conceptId: string) => {
    if (conceptId === 'root') {
      return
    }

    setSelectedId(conceptId)
    if (window.location.hash !== `#${conceptId}`) {
      window.history.pushState(null, '', `#${conceptId}`)
    }
  }, [])

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
            <dd>{data.details.metadata.detailCount.toLocaleString()}</dd>
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
          focusSearch={!selectedId}
          query={query}
          results={results}
          selectedId={selectedId}
          onQueryChange={setQuery}
          onSelectConcept={selectConcept}
        />
        <ConceptDetails
          concept={selectedConcept}
          detailsById={data.details.details}
          record={selectedRecord}
          treePath={selectedPath}
          onSelectConcept={selectConcept}
        />
      </div>
    </main>
  )
}

export default App
