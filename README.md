# CID Viewer

Modern React + TypeScript tool for viewing and exploring concept IDs with enhanced
search, detail, value, and hierarchy views. This project uses
[`episphere/conceptGithubActions`](https://github.com/episphere/conceptGithubActions)
as a maintained reference/source project.

## Features

- Search by concept ID, question text, variable name, and related terms
- Exact CID matches ranked ahead of fuzzy text matches
- Linked concept detail records with clickable `*.json` references
- React-based collapsible hierarchy generated from reference tree data
- Static reference data files bundled under `public/data` for fast local browsing

## Development

```bash
pnpm install
pnpm dev
```

Quality checks:

```bash
pnpm test
pnpm lint
pnpm build
```

## Refreshing Reference Data

Rebuild the static data files from the default reference repository:

```bash
pnpm data:build
```

`scripts/build-reference-data.mjs` resolves the latest commit from the reference
repository's default branch and compares it with the generated metadata in
`public/data/concept-index.json`. It skips rebuilding when the bundled data
already matches that upstream snapshot.

Generated metadata includes `referenceRevision` so downstream builds can confirm
which upstream snapshot produced the bundled JSON files.

The generated files are:

- `public/data/concept-index.json`
- `public/data/concept-details.json`
- `public/data/concept-tree.json`
