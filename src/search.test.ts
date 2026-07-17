import { describe, expect, it } from 'vitest'
import {
  findExactConceptMatch,
  prepareConceptSearchIndex,
  searchConcepts,
} from './search'
import type { ConceptIndexEntry } from './types'

const concepts: ConceptIndexEntry[] = [
  {
    id: '111111111',
    title: 'Blood Sample',
    terms: ['Biospecimen sample'],
    variableNames: ['BioSpm_Sample_v1r0'],
  },
  {
    id: '222222222',
    title: 'Collection Setting',
    terms: ['Care setting'],
    variableNames: ['BioSpm_Setting_v1r0'],
  },
  {
    id: '333333333',
    title: 'Shared Label',
    terms: ['Research clinic'],
    variableNames: ['ClinicVar'],
  },
  {
    id: '444444444',
    title: 'Shared Label',
    terms: ['Clinical clinic'],
    variableNames: ['OtherClinicVar'],
  },
]

const preparedConcepts = prepareConceptSearchIndex(concepts)

describe('searchConcepts', () => {
  it('does not search for empty or one-character queries', () => {
    expect(searchConcepts('', preparedConcepts)).toEqual([])
    expect(searchConcepts('   ', preparedConcepts)).toEqual([])
    expect(searchConcepts('1', preparedConcepts)).toEqual([])
  })

  it('ranks exact CID matches ahead of text matches', () => {
    const results = searchConcepts('222222222', prepareConceptSearchIndex([
      {
        id: '111111111',
        title: '222222222',
        terms: [],
        variableNames: [],
      },
      ...concepts,
    ]))

    expect(results[0]?.concept.id).toBe('222222222')
    expect(results[0]?.kind).toBe('cid')
  })

  it('finds title, variable, term, and fuzzy matches', () => {
    expect(searchConcepts('Collection Setting', preparedConcepts)[0]?.concept.id).toBe('222222222')
    expect(searchConcepts('BioSpm_Setting_v1r0', preparedConcepts)[0]?.concept.id).toBe('222222222')
    expect(searchConcepts('Research clinic', preparedConcepts)[0]?.concept.id).toBe('333333333')
    expect(searchConcepts('BloodSample', preparedConcepts)[0]?.concept.id).toBe('111111111')
  })
})

describe('findExactConceptMatch', () => {
  it('prioritizes exact CID matches', () => {
    expect(findExactConceptMatch('222222222', preparedConcepts)?.id).toBe('222222222')
  })

  it('returns unique exact text matches', () => {
    expect(findExactConceptMatch('Collection Setting', preparedConcepts)?.id).toBe('222222222')
    expect(findExactConceptMatch('BioSpm_Setting_v1r0', preparedConcepts)?.id).toBe('222222222')
    expect(findExactConceptMatch('Biospecimen sample', preparedConcepts)?.id).toBe('111111111')
  })

  it('does not return ambiguous exact text matches', () => {
    expect(findExactConceptMatch('Shared Label', preparedConcepts)).toBeUndefined()
  })
})
