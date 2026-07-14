import type {
  ConceptDetailsPayload,
  ConceptIndexPayload,
  ConceptTreePayload,
} from './types'

const dataUrl = (fileName: string) =>
  `${import.meta.env.BASE_URL}data/${fileName}`

const fetchJson = async <T,>(fileName: string): Promise<T> => {
  const response = await fetch(dataUrl(fileName))

  if (!response.ok) {
    throw new Error(`Unable to load ${fileName}: ${response.status}`)
  }

  return response.json() as Promise<T>
}

let indexPromise: Promise<ConceptIndexPayload> | undefined
let detailsPromise: Promise<ConceptDetailsPayload> | undefined
let treePromise: Promise<ConceptTreePayload> | undefined

export const loadConceptIndex = () => {
  indexPromise ??= fetchJson<ConceptIndexPayload>('concept-index.json')
  return indexPromise
}

export const loadConceptDetails = () => {
  detailsPromise ??= fetchJson<ConceptDetailsPayload>('concept-details.json')
  return detailsPromise
}

export const loadConceptTree = () => {
  treePromise ??= fetchJson<ConceptTreePayload>('concept-tree.json')
  return treePromise
}

export const loadConceptData = async () => {
  const [index, details, tree] = await Promise.all([
    loadConceptIndex(),
    loadConceptDetails(),
    loadConceptTree(),
  ])

  return { index, details, tree }
}
