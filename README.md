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
pnpm lint
pnpm build
```

## Refreshing Reference Data

Clone the reference repository, then rebuild the static data files:

```bash
git clone --depth 1 https://github.com/episphere/conceptGithubActions.git /private/tmp/conceptGithubActions
pnpm data:build /private/tmp/conceptGithubActions
```

The generated files are:

- `public/data/concept-index.json`
- `public/data/concept-details.json`
- `public/data/concept-tree.json`
