import { useMemo, useState } from 'react'
import {
  conceptRefToId,
  formatValue,
  getConceptTitle,
  isRecord,
} from '../concept-utils'
import { SelectedTreeGraphic } from './SelectedTreeGraphic'
import type {
  ConceptIndexEntry,
  ConceptRecord,
  ConceptTreeNode,
  JsonValue,
} from '../types'

type ConceptDetailsProps = {
  concept: ConceptIndexEntry | undefined
  detailsById: Record<string, ConceptRecord>
  detailsError?: string
  detailsStatus: 'idle' | 'loading' | 'ready' | 'error'
  record: ConceptRecord | undefined
  treePath: ConceptTreeNode[] | undefined
  onSelectConcept: (conceptId: string) => void
}

type JsonRendererProps = {
  fieldKey?: string
  value: JsonValue
  depth?: number
  onSelectConcept: (conceptId: string) => void
}

const isUrl = (value: string) => /^https?:\/\//i.test(value)
const compactSubcollectionThreshold = 50
const compactSubcollectionPreviewCount = 18
const valueFieldNames = [
  'Current Format/Value',
  'Format/Value',
  'Connect Value',
  'Old Quest Value',
]

function JsonScalar({ value, onSelectConcept }: JsonRendererProps) {
  if (typeof value === 'string') {
    const conceptId = conceptRefToId(value)

    if (conceptId) {
      return (
        <button
          type="button"
          className="inline-link"
          onClick={() => onSelectConcept(conceptId)}
        >
          {value}
        </button>
      )
    }

    if (isUrl(value)) {
      return (
        <a href={value} target="_blank" rel="noreferrer">
          {value}
        </a>
      )
    }
  }

  return <span>{formatValue(value)}</span>
}

function CompactSubcollections({
  value,
  onSelectConcept,
}: {
  value: JsonValue[]
  onSelectConcept: (conceptId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const conceptRefs = value
    .map((item) => ({
      id: conceptRefToId(item),
      label: typeof item === 'string' ? item : String(item),
    }))
    .filter((item): item is { id: string; label: string } => Boolean(item.id))
  const visibleRefs = expanded
    ? conceptRefs
    : conceptRefs.slice(0, compactSubcollectionPreviewCount)
  const hiddenCount = conceptRefs.length - visibleRefs.length

  return (
    <div className="compact-subcollections">
      <div className="compact-subcollections-summary">
        <strong>{conceptRefs.length.toLocaleString()} linked concept IDs</strong>
        <button
          type="button"
          className="secondary-button compact-toggle"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'Show compact' : 'Show all'}
        </button>
      </div>
      <div className="value-list compact">
        {visibleRefs.map((item, index) => (
          <button
            type="button"
            className="value-pill button-pill"
            key={`${item.id}-${index}`}
            onClick={() => onSelectConcept(item.id)}
          >
            {item.label}
          </button>
        ))}
        {hiddenCount > 0 && (
          <span className="value-pill muted-pill">
            +{hiddenCount.toLocaleString()} more
          </span>
        )}
      </div>
    </div>
  )
}

function JsonValueView({
  fieldKey,
  value,
  depth = 0,
  onSelectConcept,
}: JsonRendererProps) {
  if (!Array.isArray(value) && !isRecord(value)) {
    return <JsonScalar value={value} onSelectConcept={onSelectConcept} />
  }

  if (Array.isArray(value)) {
    const jsonRefCount = value.filter((item) => conceptRefToId(item)).length

    if (
      fieldKey?.toLowerCase() === 'subcollections' &&
      jsonRefCount > compactSubcollectionThreshold
    ) {
      return (
        <CompactSubcollections
          value={value}
          onSelectConcept={onSelectConcept}
        />
      )
    }

    return (
      <div className="value-list">
        {value.map((item, index) => (
          <span className="value-pill" key={`${String(item)}-${index}`}>
            <JsonValueView
              value={item}
              depth={depth + 1}
              onSelectConcept={onSelectConcept}
            />
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={`record-grid depth-${Math.min(depth, 3)}`}>
      {Object.entries(value).map(([key, nestedValue]) => {
        const keyConceptId = conceptRefToId(key)

        return (
          <div className="record-row nested" key={key}>
            <dt>
              {keyConceptId ? (
                <button
                  type="button"
                  className="inline-link"
                  onClick={() => onSelectConcept(keyConceptId)}
                >
                  {key}
                </button>
              ) : (
                key
              )}
            </dt>
            <dd>
              <JsonValueView
                fieldKey={key}
                value={nestedValue}
                depth={depth + 1}
                onSelectConcept={onSelectConcept}
              />
            </dd>
          </div>
        )
      })}
    </div>
  )
}

const getValueMeaning = (
  detailsById: Record<string, ConceptRecord>,
  conceptId: string,
) => getConceptTitle(detailsById[conceptId], conceptId)

const getPossibleValueSections = (
  record: ConceptRecord | undefined,
  detailsById: Record<string, ConceptRecord>,
) => {
  if (!record) return []

  return valueFieldNames.flatMap((fieldName) => {
    const value = record[fieldName]

    if (!isRecord(value)) return []

    const rows = Object.entries(value)
      .map(([conceptRef, storedCode]) => {
        const conceptId = conceptRefToId(conceptRef)
        if (!conceptId) return undefined

        return {
          conceptId,
          conceptRef,
          meaning: getValueMeaning(detailsById, conceptId),
          storedCode: formatValue(storedCode),
        }
      })
      .filter((row): row is {
        conceptId: string
        conceptRef: string
        meaning: string
        storedCode: string
      } => Boolean(row))

    return rows.length > 0 ? [{ fieldName, rows }] : []
  })
}

function PossibleValues({
  detailsById,
  onSelectConcept,
  record,
}: {
  detailsById: Record<string, ConceptRecord>
  onSelectConcept: (conceptId: string) => void
  record: ConceptRecord | undefined
}) {
  const sections = useMemo(
    () => getPossibleValueSections(record, detailsById),
    [detailsById, record],
  )

  if (sections.length === 0) return null

  return (
    <section className="possible-values-section">
      <div className="section-title">Possible values</div>
      {sections.map((section) => (
        <div className="possible-values-table-wrap" key={section.fieldName}>
          <div className="possible-values-source">{section.fieldName}</div>
          <table className="possible-values-table">
            <thead>
              <tr>
                <th>Stored code</th>
                <th>Value CID</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => (
                <tr key={`${section.fieldName}-${row.conceptId}-${row.storedCode}`}>
                  <td>
                    <code>{row.storedCode}</code>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => onSelectConcept(row.conceptId)}
                    >
                      {row.conceptId}
                    </button>
                  </td>
                  <td>{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  )
}

export function ConceptDetails({
  concept,
  detailsById,
  detailsError,
  detailsStatus,
  record,
  treePath,
  onSelectConcept,
}: ConceptDetailsProps) {
  const detailEntries = useMemo(
    () =>
      Object.entries(record ?? {}).filter(
        ([key]) => key !== 'conceptId' && !valueFieldNames.includes(key),
      ),
    [record],
  )

  if (!concept && !record) {
    return (
      <section className="details-panel empty-detail" aria-label="Concept details">
        <p className="eyebrow">Concept details</p>
        <h2>Select a concept</h2>
        <p>Search by CID or text, then choose a result to inspect its dictionary fields.</p>
      </section>
    )
  }

  const id = concept?.id ?? String(record?.conceptId ?? '')
  const title = concept?.title ?? getConceptTitle(record, id)

  return (
    <section className="details-panel" aria-label="Concept details">
      <div className="detail-header">
        <div>
          <p className="eyebrow">Concept details</p>
          <h2>{title}</h2>
        </div>
        <span className="cid-badge">{id}</span>
      </div>

      {id && (
        <section className="selected-tree-section">
          <div className="section-title">Tree structure</div>
          <SelectedTreeGraphic
            selectedId={id}
            treePath={treePath}
            onSelectConcept={onSelectConcept}
          />
        </section>
      )}

      <PossibleValues
        detailsById={detailsById}
        record={record}
        onSelectConcept={onSelectConcept}
      />

      <div className="section-title">Dictionary record</div>
      {detailsStatus === 'loading' ? (
        <div className="empty-state compact">
          <strong>Loading local detail record</strong>
          <span>Fetching the dictionary fields for this concept.</span>
        </div>
      ) : detailsStatus === 'error' ? (
        <div className="empty-state compact">
          <strong>Unable to load detail records</strong>
          <span>{detailsError ?? 'Try reloading the page and selecting the concept again.'}</span>
        </div>
      ) : detailEntries.length > 0 ? (
        <dl className="record-grid">
          {detailEntries.map(([key, value]) => (
            <div className="record-row" key={key}>
              <dt>{key}</dt>
              <dd>
                <JsonValueView
                  fieldKey={key}
                  value={value}
                  onSelectConcept={onSelectConcept}
                />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="empty-state compact">
          <strong>No local detail record</strong>
          <span>This CID is present in the search index but not in the reference JSON detail set.</span>
        </div>
      )}
    </section>
  )
}
