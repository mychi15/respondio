# Flow Chart Builder

A canvas-based editor for building messaging/automation flows: drag out a tree of nodes (triggers, messages, comments, business-hours branches), edit each one in a details drawer, and have every change persisted automatically. Built with Vue 3 + Vue Flow, backed by Vercel Serverless Functions and Vercel Blob storage.

See [ROADMAP.md](ROADMAP.md) for the full milestone history and the original scope decisions this was built against.

## Setup

Requires [pnpm](https://pnpm.io/).

```bash
pnpm install
```

No `.env.local` is required to get started: `API_BASE_URL` ([src/api/flowApi.ts](src/api/flowApi.ts)) defaults to the deployed instance of this app in local dev, so the local frontend talks to it out of the box. Deployed builds default to `''` instead, so each deployment (including previews) calls its own same-origin `/api`. `api/flow.ts` and `api/upload.ts` are Vercel Serverless Functions backed by Upstash Redis (flow data) and Vercel Blob (attachments) — plain `vite` doesn't run them, which is why the default points at a deployment rather than `localhost`.

Only set `VITE_API_BASE_URL` in `.env.local` if you need to override that default — e.g. to run the API functions locally yourself (see [Running the project](#running-the-project)), which needs its own `KV_REST_API_URL`/`KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`) for flow data and `BLOB_READ_WRITE_TOKEN` for uploads.

## How it works

**Data model.** A flow is a flat array of nodes (`FlowNode[]`, [src/types/flow.ts](src/types/flow.ts)). There is no separate edge list — each node points at its parent via `parentId`, and the canvas tree (and its Vue Flow edges) is derived from that relationship on every render ([src/utils/flowGraph.ts](src/utils/flowGraph.ts)). The root node has `parentId: -1`. Five node types exist: `trigger` (flow entry, display-only), `sendMessage`, `addComment`, `dateTime` (business hours, branches into two `dateTimeConnector` children for `success`/`failure`), and `dateTimeConnector` itself (display-only).

**Canvas.** [CanvasView.vue](src/views/CanvasView.vue) renders the tree with [Vue Flow](https://vueflow.dev/). Node positions are computed layout, not stored — [src/utils/flowLayout.ts](src/utils/flowLayout.ts) walks the tree depth-first and lays out each node under its parent. Quick-add affordances (a `+` on every edge midpoint, a `+` after every leaf) let you insert or append a node without opening the modal first.

**State.** [useFlowStore](src/stores/useFlowStore.ts) (Pinia, setup-store style) is the single source of truth for `nodes`. All mutations (`createNode`, `updateNode`, `updateBusinessHours`, `updateSendMessagePayload`, `updateComment`, `deleteNode`) act on it synchronously, then call `persist()` to push the whole flow back to the API. The store derives `vueFlowNodes`/`vueFlowEdges`/`addNodePlaceholders` as computed properties, so the canvas is always a pure function of `nodes`.

**Editing.** Clicking an interactive node opens [NodeDrawer.vue](src/components/nodes/NodeDrawer.vue), which renders a per-type fields component (`SendMessageFields`, `AddCommentFields`, `BusinessHoursFields`) alongside the shared title/description editor and delete action. The same content is reachable as a standalone page at `/node/:nodeId` ([NodeDetailView.vue](src/views/NodeDetailView.vue)) for deep-linking/sharing.

**Persistence.** [useFlowQuery](src/composables/useFlowQuery.ts) (TanStack Query) fetches the flow on mount and syncs it into the store; this runs in both `CanvasView` and `NodeDetailView` so a direct load of a node URL works without visiting the canvas first. `GET/POST /api/flow?key=` ([api/flow.ts](api/flow.ts)) reads/writes the flow as a single JSON value in Upstash Redis, seeding it from [api/_fixtures/mockFlow.ts](api/_fixtures/mockFlow.ts) on first read if the key doesn't exist yet. Attachment uploads go through `POST /api/upload` ([api/upload.ts](api/upload.ts)), which issues a Vercel Blob client-upload token rather than proxying the file through the function body.

## Design decisions

- **Edges are implicit, derived from `parentId`.** Keeping a flat node array with a parent pointer (rather than a separate nodes+edges graph) means there's one place mutations happen and nothing to keep in sync; the canvas tree, the parent-picker dropdown, and cascade-delete all walk the same structure.
- **Positions are computed, not stored.** Node coordinates are a pure function of the tree shape (`flowLayout.ts`), so inserting/deleting a node never leaves stale or overlapping positions behind — the whole subtree just re-lays-out.
- **Store-mutate-then-persist, not `useMutation`.** Every store action mutates `nodes` immediately (optimistic, no rollback) and fires `persist()` as an unawaited side effect; failures surface as a toast, not a reverted UI state. This was a deliberate MVP tradeoff over wrapping each action in TanStack Query mutations with `onMutate`/`onError` rollback — simpler, and acceptable because the only failure mode is "the last edit didn't save," which the toast makes visible.
- **Saves are chained, not raced.** `persist()` chains onto a `pendingSave` promise instead of firing every call independently, so a rapid second edit can't have its request land before (and get overwritten by) a slower first one.
- **Cascade delete.** Deleting a node removes it and every downstream descendant (including whole `dateTime` success/failure subtrees). This was chosen over "delete just this node and re-parent its children" because a flow node's children are only meaningful in that node's context (e.g. a business-hours branch doesn't make sense reattached elsewhere).
- **`trigger` / `dateTimeConnector` are display-only.** They're real, positioned canvas nodes (so the tree has a visible root and visible branches) but intentionally not clickable and have no drawer — editing them wasn't in scope, and making them inert avoids a half-built edit UI for a node type with almost no editable data.
- **Per-type field components over composables.** The roadmap originally planned `useAttachments()`/`useComments()`/`useBusinessHours()` composables; these became full components (`SendMessageFields.vue`, etc.) instead, since each one owns both state and a non-trivial template, which a composable would just end up re-exposing to a wrapper component anyway.
- **Curated timezone list over `Intl.supportedValuesOf('timeZone')`.** A hand-picked `TIMEZONE_OPTIONS` combobox ([src/data/timezoneOptions.ts](src/data/timezoneOptions.ts)) was chosen over the full IANA set so the dropdown stays navigatable with typeahead search rather than listing hundreds of rarely-used zones.
- **Flow data lives in Upstash Redis; uploaded files live in Vercel Blob.** Flow data started out in Blob too, but every overwrite took ~1–1.5s (a full file rewrite plus CDN cache purge) and reads right after a write could return stale or broken content. A single Redis key per flow (one JSON value per deployment/test-key, in the same region as the functions) makes saves take milliseconds and reads immediately consistent. Blob is still the right fit for attachments: write-once static files served from a CDN.
- **Client-upload token endpoint instead of a server-side proxy.** `/api/upload` hands the browser a signed Blob upload token rather than streaming the file through the serverless function body, sidestepping the platform's request-body size limit entirely.
- **`description` added to the schema as optional.** The original sample payload had no description field; it was added to satisfy a title+description+type requirement per node, kept optional (not required) so empty-description rendering stays exercised, not just the populated case.

## Project structure

```
src/
  components/
    nodes/        # node renderer, drawer, per-type field editors
    toolbar/       # create-node modal/form, parent-picker tree select
    edges/         # custom quick-add edge
    ui/            # shadcn-vue primitives (button, dialog, select, ...)
  composables/     # useFlowQuery, useNodeDrawer, useCreateNodeModal, useToast
  stores/          # useFlowStore (Pinia)
  utils/           # flowGraph (tree/edges), flowLayout (positions), validation, ids
  api/             # fetchFlow/saveFlow/uploadAttachment (client-side fetch wrappers)
  views/           # CanvasView, NodeDetailView
  router/          # route table
api/               # Vercel Serverless Functions: /api/flow, /api/upload
e2e/               # Playwright config helpers + golden-path spec
```

## Running the project

```bash
pnpm dev        # vite dev server, http://localhost:5173
```

With `VITE_API_BASE_URL` set to the deployed instance (see [Setup](#setup)), this is all you need — the local frontend reads/writes flow data against the same live Redis database as the deployed app.

If you'd rather run the API functions locally too (e.g. to test changes to `api/flow.ts`/`api/upload.ts` without deploying), run `vercel dev` instead of `pnpm dev`, and point `VITE_API_BASE_URL` at it (e.g. `http://localhost:3000`). That needs its own Redis and Blob credentials — `vercel link` + `vercel env pull .env.local` if you have access to the project, or add your own Upstash Redis (Vercel Marketplace) and Blob store if you don't. Without Redis credentials, `GET /api/flow` serves the fixture and saves fail.

Other scripts:

```bash
pnpm build       # vue-tsc -b && vite build
pnpm preview     # preview the production build
pnpm lint        # eslint .
pnpm format      # prettier --write .
pnpm typecheck   # vue-tsc --noEmit
```

## Running tests

**Unit/component tests** (Vitest + `@vue/test-utils`, co-located as `*.spec.ts` next to the source file):

```bash
pnpm test
```

**End-to-end tests** (Playwright, [e2e/golden-path.spec.ts](e2e/golden-path.spec.ts)): drives the full flow — load → create node → edit title/description → upload attachment → edit type-specific fields → cascade-delete — against a dedicated test blob key (`TEST_FLOW_KEY`, separate from the real flow data) and asserts against both the UI and the persisted JSON.

```bash
pnpm test:e2e
```

This spawns its own `vite` dev server on a fixed port with `VITE_FLOW_KEY` pointed at the test key, and reads `VITE_API_BASE_URL` from `.env.local` (Playwright's Node process doesn't get Vite's automatic env loading, so [e2e/env.ts](e2e/env.ts) parses the same file manually). You'll need a working `VITE_API_BASE_URL` for this to pass, for the same reason `pnpm dev` does.

Before finalizing any change, run all three gates:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every pull request and push to `master`:

- **`checks`** — `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
- **`e2e`** — `pnpm test:e2e` (after `checks` passes), with `VITE_API_BASE_URL` pointed at the deployed instance. Runs are serialized across branches because they all reset and mutate the same shared test flow key. On failure, the Playwright report and traces are uploaded as a `playwright-report` artifact.

Deploys are handled separately by Vercel's Git integration. CI doesn't verify `api/` function behaviour — e2e exercises the frontend against the already-deployed API.
