import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { loadConceptData } from './data'
import type {
  ConceptDetailsPayload,
  ConceptIndexPayload,
  ConceptTreePayload,
} from './types'

vi.mock('./data', () => ({
  loadConceptData: vi.fn(),
}))

const index: ConceptIndexPayload = {
  metadata: {
    generatedAt: '2026-01-01T00:00:00.000Z',
    generatedFrom: 'test fixture',
    conceptCount: 3,
    detailCount: 3,
    treeRowCount: 3,
  },
  concepts: [
    {
      id: '111111111',
      title: 'Parent Concept',
      terms: ['Parent Term'],
      variableNames: ['ParentVar'],
    },
    {
      id: '222222222',
      title: 'Linked Concept',
      terms: ['Linked Term'],
      variableNames: ['LinkedVar'],
    },
    {
      id: '333333333',
      title: 'Unique Exact Title',
      terms: ['Third Term'],
      variableNames: ['ThirdVar'],
    },
  ],
}

const details: ConceptDetailsPayload = {
  metadata: index.metadata,
  details: {
    '111111111': {
      conceptId: '111111111',
      'Current Question Text': 'Parent Concept',
      subcollections: ['222222222.json'],
    },
    '222222222': {
      conceptId: '222222222',
      'Current Question Text': 'Linked Concept',
      'Primary Source': '111111111.json',
    },
    '333333333': {
      conceptId: '333333333',
      'Current Question Text': 'Unique Exact Title',
    },
  },
}

const tree: ConceptTreePayload = {
  metadata: index.metadata,
  tree: {
    id: 'root',
    title: 'root',
    children: [
      {
        id: '111111111',
        title: 'Parent Concept',
        children: [
          {
            id: '222222222',
            title: 'Linked Concept',
          },
        ],
      },
      {
        id: '333333333',
        title: 'Unique Exact Title',
      },
    ],
  },
}

const mockLoadConceptData = vi.mocked(loadConceptData)

describe('App search and selection', () => {
  beforeEach(() => {
    mockLoadConceptData.mockReset()
    mockLoadConceptData.mockResolvedValue({ details, index, tree })
    window.history.replaceState(null, '', '/cid-viewer/')
  })

  it('auto-selects exact CID searches without showing redundant status text', async () => {
    const user = userEvent.setup()

    render(<App />)

    const search = await screen.findByRole('searchbox', { name: 'Search' })
    await user.type(search, '111111111')

    expect(search).toHaveValue('111111111')
    expect(await screen.findByRole('heading', { level: 2, name: 'Parent Concept' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#111111111')

    const searchPanel = screen.getByRole('complementary', { name: 'Concept search' })
    expect(within(searchPanel).queryByText('Exact match selected')).not.toBeInTheDocument()
  })

  it('preserves an exact title query while selecting matching details', async () => {
    const user = userEvent.setup()

    render(<App />)

    const search = await screen.findByRole('searchbox', { name: 'Search' })
    await user.type(search, 'Unique Exact Title')

    expect(search).toHaveValue('Unique Exact Title')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Unique Exact Title' }),
    ).toBeInTheDocument()
    expect(window.location.hash).toBe('#333333333')
  })

  it('syncs the search input when a displayed concept ID link is clicked', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(
      await screen.findByRole('button', { name: /Parent Concept/ }),
    )

    const search = screen.getByRole('searchbox', { name: 'Search' })
    expect(search).toHaveValue('111111111')
    expect(await screen.findByRole('heading', { level: 2, name: 'Parent Concept' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '222222222.json' }))

    expect(search).toHaveValue('222222222')
    expect(await screen.findByRole('heading', { level: 2, name: 'Linked Concept' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#222222222')
  })
})
