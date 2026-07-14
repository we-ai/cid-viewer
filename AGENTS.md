# Agent Workflow Settings

## Project Mission

This project is a React + TypeScript tool for viewing and exploring concept IDs with enhanced search, detail, value, and hierarchy views. It uses `episphere/conceptGithubActions` as a maintained reference/source project.

Primary reference sources:

- Reference repository: <https://github.com/episphere/conceptGithubActions>
- Reference live page: <https://episphere.github.io/conceptGithubActions/web/>

This viewer should preserve source data semantics while adding a maintainable React + TypeScript + Vite architecture and enhanced browsing workflows.

## Current Stack

- React 19 with TypeScript
- Vite for development and builds
- Oxlint for linting
- `@ff-labs/fff-node` is currently installed for fuzzy matching work

## Product Priorities

- Provide a user-friendly interface for viewing concepts by CID.
- Support search by concept ID and concept text.
- Support fuzzy search with predictable, explainable ranking.
- Preserve source data semantics when adapting scripts or UI behavior.
- Include the collapsible/tree-style exploration flow where it remains useful for concept ID browsing.

## Workflow

- Start every task by checking `git status --short`.
- Read this file, `package.json`, and the relevant source files before editing.
- When behavior is informed by `conceptGithubActions`, inspect the reference repository or live page and record durable assumptions in tracked project documentation.
- Implement in small vertical slices: data shape, search/transform logic, UI state, then presentation.
- Prefer typed data models and pure transformation/search functions that can be tested independently from React.
- Keep generated data artifacts separate from hand-authored source. Avoid committing large regenerated files unless the task explicitly calls for it.
- Do not overwrite uncommitted user changes. Work with them or ask if they block the task.

## React Architecture

- Use functional components and hooks.
- Avoid direct DOM manipulation except for focused integration boundaries.
- Keep shared domain logic out of components; prefer modules under `src/` such as `data`, `search`, `types`, or `utils` as the app grows.
- Keep component state close to the UI that owns it; introduce app-level state only when multiple workflows truly share it.
- Prefer accessible native controls and clear keyboard/focus behavior for search and navigation.

## Search Guidance

- Hide fuzzy-search implementation behind a small local API, for example `searchConcepts(query, concepts, options)`.
- Evaluate search implementation changes with realistic CID/text queries before replacing the current search path.
- Exact CID matches should outrank fuzzy text matches.
- Empty or whitespace-only queries should not trigger expensive search work.
- Keep scoring stable enough that UI behavior is reproducible.

## UI Guidance

- Build the usable CID viewer directly; avoid turning the app into a marketing landing page.
- Favor dense, scannable layouts suitable for repeated data lookup.
- Make search, result filtering, and concept details efficient on desktop and mobile.
- Use restrained styling and avoid decorative UI that competes with the data.
- Verify that text and controls do not overlap at mobile and desktop widths.

## Verification

Run these before handing off code changes when relevant:

```bash
pnpm lint
pnpm build
```

If UI behavior changes, also run the app locally and inspect the affected flows:

```bash
pnpm dev
```
