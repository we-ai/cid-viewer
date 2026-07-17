import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const referenceRepo = 'https://github.com/episphere/conceptGithubActions'
const referenceRevision = '1df3da519c47c6d877f9e6b5e96d92c2d8f649bd'
const outputRoot = path.join(projectRoot, 'public', 'data')
const tempRoots = []

const cloneReferenceRepo = () => {
  const checkoutRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'concept-reference-'))
  tempRoots.push(checkoutRoot)
  execFileSync('git', ['init', '--initial-branch=main', checkoutRoot], { stdio: 'inherit' })
  execFileSync('git', ['-C', checkoutRoot, 'remote', 'add', 'origin', referenceRepo], {
    stdio: 'inherit',
  })
  execFileSync(
    'git',
    ['-C', checkoutRoot, 'fetch', '--depth', '1', 'origin', referenceRevision],
    {
      stdio: 'inherit',
    },
  )
  execFileSync('git', ['-C', checkoutRoot, 'checkout', '--detach', 'FETCH_HEAD'], {
    stdio: 'inherit',
  })
  return checkoutRoot
}

let referenceRoot = ''

const readJson = (fileName) =>
  JSON.parse(fs.readFileSync(path.join(referenceRoot, fileName), 'utf8'))

const cleanText = (value) =>
  String(value ?? '')
    .replace(/<\/?b>/g, '')
    .replace(/\.json$/i, '')
    .trim()

const cleanId = (value) => {
  const text = cleanText(value)
  const match = text.match(/^\d{9}$/)

  return match?.[0] ?? ''
}

const toArray = (value) => {
  if (Array.isArray(value)) return value.flatMap((item) => toArray(item))
  if (value == null || value === '') return []
  return [value]
}

const toConceptIds = (value) =>
  toArray(value)
    .map((item) => cleanId(item))
    .filter(Boolean)

const addTerm = (bucket, value) => {
  if (value == null) return

  if (Array.isArray(value)) {
    value.forEach((item) => addTerm(bucket, item))
    return
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      addTerm(bucket, key)
      addTerm(bucket, item)
    })
    return
  }

  const text = String(value).replace(/<\/?b>/g, '').trim()
  if (text) bucket.add(text)
}

const ensureEntry = (byId, id) => {
  const clean = cleanId(id)
  if (!clean) return undefined

  if (!byId.has(clean)) {
    byId.set(clean, {
      id: clean,
      title: clean,
      terms: new Set(),
      variableNames: new Set(),
    })
  }

  return byId.get(clean)
}

const getChildren = (childMap, parent) => {
  if (!childMap.has(parent)) childMap.set(parent, new Set())
  return childMap.get(parent)
}

const addEdge = (childMap, parent, child) => {
  const source = parent === 'root' ? 'root' : cleanId(parent)
  const target = child === 'root' ? 'root' : cleanId(child)
  if (!source || !target || source === target) return
  getChildren(childMap, source).add(target)
}

const buildData = () => {
  const varToConcept = readJson('jsons/varToConcept.json')
  const aggregate = readJson('aggregate.json')
  const treeRows = readJson('collapsibleTree.json')
  const details = {}

  for (const fileName of fs.readdirSync(path.join(referenceRoot, 'jsons'))) {
    if (!/^\d{9}\.json$/.test(fileName)) continue

    const id = fileName.slice(0, -5)
    details[id] = JSON.parse(
      fs.readFileSync(path.join(referenceRoot, 'jsons', fileName), 'utf8'),
    )
  }

  const byId = new Map()

  for (const [term, cid] of Object.entries(varToConcept)) {
    for (const conceptId of toConceptIds(cid)) {
      const entry = ensureEntry(byId, conceptId)
      if (entry) addTerm(entry.terms, term)
    }
  }

  for (const [id, detail] of Object.entries(details)) {
    const entry = ensureEntry(byId, id)
    if (!entry) continue

    const title =
      detail['Current Question Text'] ??
      detail['Question Text'] ??
      detail['Variable Label'] ??
      aggregate[id]?.['Variable Label']

    if (title) entry.title = String(title)
    addTerm(entry.terms, title)
    addTerm(entry.terms, detail['Variable Label'])
    addTerm(entry.terms, detail['Variable Name'])
    addTerm(entry.terms, detail['Quest_Src Question'])
    addTerm(entry.terms, detail['Source Question'])

    for (const name of toArray(detail['Variable Name'])) {
      entry.variableNames.add(String(name))
    }
  }

  for (const row of treeRows) {
    const entry = ensureEntry(byId, row.conceptId)
    if (entry) {
      const title = row['Question Text'] ?? row['Variable Label']
      if (title && entry.title === entry.id) entry.title = String(title)
      addTerm(entry.terms, title)
      addTerm(entry.terms, row['Variable Label'])
      addTerm(entry.terms, row['Variable Name'])
      addTerm(entry.terms, row['Quest_Src Question'])
    }

    for (const key of ['Primary Source', 'Secondary Source', 'Source Question']) {
      for (const ref of toConceptIds(row[key])) ensureEntry(byId, ref)
    }
  }

  const concepts = [...byId.values()]
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      terms: [...entry.terms]
        .filter((term) => term !== entry.title)
        .sort((a, b) => a.localeCompare(b)),
      variableNames: [...entry.variableNames].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const childMap = new Map()

  for (const row of treeRows) {
    const primary = cleanId(row['Primary Source'])
    const secondary = cleanId(row['Secondary Source'])
    const sourceQuestions = toConceptIds(row['Source Question'])
    const conceptId = cleanId(row.conceptId)

    addEdge(childMap, 'root', primary)
    if (secondary) addEdge(childMap, primary, secondary)
    for (const sourceQuestion of sourceQuestions) {
      addEdge(childMap, secondary || primary, sourceQuestion)
      addEdge(childMap, sourceQuestion, conceptId)
    }
    if (sourceQuestions.length === 0) addEdge(childMap, secondary || primary, conceptId)

    for (const child of toConceptIds(row.subcollections)) addEdge(childMap, conceptId, child)
  }

  const buildNode = (id, depth = 0, ancestors = new Set()) => {
    const clean = id === 'root' ? 'root' : cleanId(id)
    const detail = details[clean]
    const indexEntry = byId.get(clean)
    const childIds = [...(childMap.get(clean) ?? [])]
      .filter((childId) => !ancestors.has(childId))
      .sort((a, b) => {
        const titleA = byId.get(a)?.title ?? a
        const titleB = byId.get(b)?.title ?? b
        return titleA.localeCompare(titleB, undefined, { numeric: true })
      })

    const node = {
      id: clean === 'root' ? 'root' : clean,
      title:
        clean === 'root'
          ? 'Connect Study'
          : indexEntry?.title ||
            detail?.['Current Question Text'] ||
            detail?.['Question Text'] ||
            clean,
    }

    if (clean !== 'root') {
      const variableNames = indexEntry?.variableNames
        ? [...indexEntry.variableNames].slice(0, 3)
        : []
      if (variableNames.length > 0) node.variableNames = variableNames
    }

    if (childIds.length > 0 && depth < 8) {
      const nextAncestors = new Set(ancestors)
      nextAncestors.add(clean)
      node.children = childIds.map((childId) => buildNode(childId, depth + 1, nextAncestors))
    }

    return node
  }

  const metadata = {
    generatedFrom: referenceRepo,
    generatedAt: new Date().toISOString(),
    referenceRevision,
    conceptCount: concepts.length,
    detailCount: Object.keys(details).length,
    treeRowCount: treeRows.length,
  }

  return {
    details: { metadata, details },
    index: { metadata, concepts },
    tree: { metadata, tree: buildNode('root') },
  }
}

try {
  referenceRoot = cloneReferenceRepo()
  fs.mkdirSync(outputRoot, { recursive: true })

  const data = buildData()
  fs.writeFileSync(path.join(outputRoot, 'concept-index.json'), JSON.stringify(data.index))
  fs.writeFileSync(path.join(outputRoot, 'concept-details.json'), JSON.stringify(data.details))
  fs.writeFileSync(path.join(outputRoot, 'concept-tree.json'), JSON.stringify(data.tree))

  console.log(
    `Wrote ${data.index.metadata.conceptCount} concepts, ${data.details.metadata.detailCount} detail records, and ${data.tree.metadata.treeRowCount} tree rows to ${path.relative(projectRoot, outputRoot)}`,
  )
} finally {
  for (const tempRoot of tempRoots) {
    fs.rmSync(tempRoot, { force: true, recursive: true })
  }
}
