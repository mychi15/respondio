# ROADMAP — Flow Chart Builder (MVP)

A canvas-based flow chart app for building messaging/automation flows, built with Vue Flow and deployed to Vercel.

## Stack

- Vue 3 (`<script setup lang="ts">`, Composition API)
- TypeScript, ES6+
- Vite
- Pinia (setup stores)
- Vue Router
- Vue Flow (`@vue-flow/core`)
- TanStack Query (`@tanstack/vue-query`)
- Vercel Blob (attachment storage + persisted flow JSON)
- Vercel Serverless Functions (upload handler, flow JSON read/write)
- Tailwind CSS
- shadcn-vue (reka-ui base, lucide icons) — modal/select/button/form primitives
- Deployment: Vercel

## Node Types (MVP)

| Type key | Label | Interactive |
|---|---|---|
| `sendMessage` | Send Message | yes |
| `addComment` | Add Comment | yes |
| `dateTime` | Business Hours | yes |
| `dateTimeConnector` (`success`/`failure`) | Success / Failure | display-only, not clickable/editable |
| `trigger` | Trigger (flow entry) | out of scope for MVP editing — root node only |

## Data Model

Flow data arrives as a **flat array of nodes**; tree structure (and therefore canvas edges) is derived from each node's `parentId` pointing at another node's `id`, not from a separate edges array. Root node has `parentId: -1`.

```ts
type NodeId = string | number;

interface BaseNode<TType extends string, TData> {
  id: NodeId;
  parentId: NodeId;   // -1 for root/trigger
  name?: string;       // used as node "title" — root trigger has no name
  description?: string; // editable free text; added to schema for the title+description+type requirement
  type: TType;
  data: TData;
}

type TriggerNode = BaseNode<'trigger', {
  type: 'conversationOpened';
  oncePerContact: boolean;
}>;

type SendMessagePayloadItem =
  | { type: 'text'; text: string }
  | { type: 'attachment'; attachment: string }; // URL

type SendMessageNode = BaseNode<'sendMessage', {
  payload: SendMessagePayloadItem[];
}>;

type AddCommentNode = BaseNode<'addComment', {
  comment: string;
}>;

type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

type BusinessHoursNode = BaseNode<'dateTime', {
  times: Array<{ day: Weekday; startTime: string; endTime: string }>; // "HH:mm"
  connectors: NodeId[]; // [successConnectorId, failureConnectorId]
  timezone: string;
  action: 'businessHours';
}>;

type ConnectorNode = BaseNode<'dateTimeConnector', {
  connectorType: 'success' | 'failure';
}>;

type FlowNode =
  | TriggerNode
  | SendMessageNode
  | AddCommentNode
  | BusinessHoursNode
  | ConnectorNode;
```

**Notable implications for implementation:**
- **Edges are implicit.** Build the Vue Flow edge list by mapping each node's `parentId` → `id` (skip the root's `-1`). `dateTime.data.connectors` is a redundant cross-reference to the same relationship and can be used to validate/order the two connector branches but isn't a second source of truth.
- **`description` added to the schema** as an optional string on `BaseNode`, alongside `name`/`type`, to satisfy the title + description + type requirement. It's optional, not required — the mock schema fixture (see M5) should include a realistic mix of nodes with and without a `description` (matching the original sample payload, which has none) so empty-description rendering is exercised too, not just the populated case.
- **`addComment` is a standalone node attached via `parentId`**, not an inline property on the node it comments on (see `e879e4` parented to `b6a0c1`). Canvas rendering must treat comments as real flow nodes (with their own position/box), not as an annotation overlay.
- **`trigger` is out of scope for MVP** — pre-existing root node per flow, not user-creatable, not clickable/editable, no drawer. Render it on canvas (so the tree has a visible root) but treat it the same as `success`/`failure`: display-only.
- **`dateTimeConnector` nodes carry an id/parentId like any other node** — they sit structurally between `dateTime` and its branches, confirming they're real (positioned) canvas nodes, just non-interactive per the original spec.

---

## Milestones

### M0 — Project Scaffolding
- [x] Init Vite + Vue 3 + TypeScript project
- [x] Install & configure Pinia, Vue Router, Vue Flow, Vue Query
- [x] Base routing: canvas view (`/`) and node detail route (`/node/:nodeId`)
- [x] ESLint + Prettier + `vue-tsc` wired up (`pnpm lint`, `pnpm typecheck`)
- [x] Vitest + `@vue/test-utils` configured
- [x] Vercel project setup & initial deploy (empty shell)

### M1 — Canvas Foundation
- [x] Integrate Vue Flow canvas as the main view
- [x] Define `FlowNode` TypeScript types (id, type, title, description, data payload per type)
- [x] Pinia store (`useFlowStore`) holding nodes/edges state
- [x] Custom node renderer component:
  - [x] icon (per node type)
  - [x] title
  - [x] description, truncated to 3 lines (CSS line-clamp)
- [x] Visual distinction for `trigger` / `success` / `failure` nodes (non-interactive styling, no click handlers)
- [x] Edge quick-add: plus-circle button at the midpoint of every edge; clicking it inserts a new node spliced between the edge's source and target
- [x] Leaf nodes (no children) render a dashed placeholder edge ending in a plus-circle button; hover turns the edge/button orange; clicking it appends a default child node
- [x] Both quick-add actions create a default placeholder node (6-character hex id, default type) directly via the store — the full create-node modal (title/description/type picker) remains M2 scope

### M2 — Create Node Flow
- **Toolbar button**, two cases depending on canvas state:
  - [x] Empty canvas (no nodes) → clicking creates the `trigger` node directly, no modal (trigger has no name/description/type choice)
  - [x] Non-empty canvas → clicking opens the Create-New-Node modal with `trigger` offered as a 4th type option alongside Send Message / Add Comment / Business Hours
    - [x] Type = `trigger` → Title/Description hidden, no parent required; submit creates an independent second root (`parentId: -1`) — a new, separate tree on the same canvas
    - [x] Type = anything else → **Parent** field required: a dropdown rendered as a nested, indented tree (children indented under their parent); submit appends the new node as a child of the chosen parent
- **Quick-add buttons** (edge midpoint `+`, leaf `+`) — rerouted through the same modal, pre-filled with their attachment context (insert-between or append-child):
  - [x] No Parent field shown (attach point already implied by which button was clicked)
- **Store (`useFlowStore.ts`) — consolidated node creation**
  - [x] Replace `createDefaultNode` + `insertNodeBetween` + `addChildNode` with one generic `createNode(input, attachment)` action, where `attachment` is `{ mode: 'root' }` (new independent trigger), `{ mode: 'insert'; sourceId; targetId }` (splice into an existing edge), or `{ mode: 'add'; parentId }` (append as a child)
  - [x] Per-type `data` defaults via a `createDataForType(type)` helper (`trigger`/`sendMessage`/`addComment`/`dateTime`)

### M3 — Node Details Drawer (Core)
- [x] Drawer component, toggled by clicking a node (closed by clicking elsewhere / close button)
- [x] Route-driven visibility: drawer open state driven by `/node/:nodeId` (deep-linkable, shareable URL) — both routes render `CanvasView`; `useNodeDrawer` reads the open node from the route and `open`/`close` navigate. Replaced the earlier standalone `NodeDetailView` page
- [x] Drawer header: editable title + description fields (inline edit, persisted to store)
- [x] Delete node action (with confirmation) from drawer — **cascades**: deleting a node removes it and every downstream descendant (recursive `parentId` chain), including any `success`/`failure` connector branches and their children
- [x] Guard: `trigger` / `success` / `failure` nodes never open a drawer / aren't clickable
- [x] Composable `useNodeDrawer()` for open/close + route sync logic — open/close/resize state; route sync still pending (see above)
- [x] Unit tests: drawer open/close, edit, delete

### M4 — Node-Type-Specific Drawer Content
- [x] **Send Message**
  - [x] Attachments section: existing attachments (`payload[].attachment` URLs) shown as tile/box previews
  - [x] Upload new attachment: file input → POST to serverless function (`/api/upload`) → function streams file to Vercel Blob → returns CDN URL → append `{ type: 'attachment', attachment: cdnUrl }` to `payload` and persist — currently files are read client-side as base64 data URLs (`SendMessageFields.vue`); the Blob upload endpoint is M5 scope
  - [x] Remove attachment from list (removes the payload item; orphaned blob cleanup out of MVP scope)
  - [x] Message text: input field showing existing text(s), allow update/remove
- [x] **Add Comments**
  - [x] Existing `data.comment` shown in input field
  - [x] Update / clear comment text
  - [x] Delete cascades: removes the comment node and any downstream descendants (consistent with the global delete-cascade rule)
- [x] **Business Hours**
  - [x] Render `data.times` (one row per weekday, `mon`–`sun`) with start/end time pickers
  - [x] `data.timezone`: select field listing timezones (`TIMEZONE_OPTIONS` combobox over the full `Intl.supportedValuesOf('timeZone')` set, with UTC offsets precomputed into JSON)
  - [x] Preserve `data.connectors` (success/failure branch ids) on save — not user-editable, just passed through
  - [x] Validate `startTime < endTime` per row (24h `HH:mm`)
- [x] Composables per concern: `useAttachments()`, `useComments()`, `useBusinessHours()` — implemented instead as per-type field components (`SendMessageFields.vue`, `AddCommentFields.vue`, `BusinessHoursFields.vue`) rather than standalone composables

### M5 — Data Layer / Persistence
- [x] Define API contract from the finalized schema (fetch/save flow + nodes) — `GET`/`POST /api/flow?key=`
- [x] Author **mock schema fixture**: full flow sample with every node type represented; `description` is optional per node, so include both nodes with a populated `description` and nodes without one (matching real-world data); uploaded to **Vercel Blob** as the static source-of-truth JSON for e2e testing — `api/_fixtures/mockFlow.json`, seeded to Blob lazily on first `GET` of a missing key
- [x] Serverless function `POST /api/flow` (or similar): reads/writes the flow JSON blob — update-in-place on every mutation (create/update/delete node, including cascade deletes)
- [x] Serverless function `POST /api/upload`: accepts a file, uploads to Vercel Blob, returns the resulting CDN URL to be stored in `payload[].attachment` — implemented as a Vercel Blob client-upload token endpoint (`handleUpload`) rather than a server-side proxy, to avoid the serverless body-size limit
- [x] Wire Vue Query for fetching flow data (load on canvas mount, from the Blob-hosted JSON via the read endpoint)
- [x] Wire Vue Query mutations for create/update/delete node, attachments, comments, business hours — each mutation persists the full updated flow JSON back to Blob via `/api/flow` — the store mutates its local working copy synchronously, then `persist()` saves the full flow through one scoped `useMutation` (serial, in call order) that also writes the saved copy into the `['flow']` query cache.
- [x] Optimistic updates + cache invalidation strategy — simple strategy: store stays source of truth, mutates immediately, persists after; no rollback on failure (toast only) — accepted MVP tradeoff, not full `onMutate`/`onError` rollback
- [x] Error/loading states surfaced in UI (including upload failure/progress) — canvas loading placeholder, toast on fetch/save/upload failure, per-attachment uploading spinner tile
- [x] Playwright E2E golden path driven against the Blob-hosted mock schema: load flow → create node → edit title/description → upload attachment → edit type-specific fields → delete (cascade) → verify canvas + drawer state + updated Blob JSON

### M6 — Polish & Hardening
- [x] Canvas UX: pan/zoom defaults, minimap/controls (Vue Flow built-ins) as needed
- [x] Accessibility pass on drawer (focus trap, add 'id' for form fields, keyboard close)
- [x] Empty states (no nodes yet, no attachments, no comments, no `description` on a node)
- [x] CI/CD pipeline for running tests — GitHub Actions (`.github/workflows/ci.yml`): lint, typecheck, unit tests, build, then serialized Playwright e2e against the deployed API; deploys stay on Vercel Git integration
- [x] Keyboard accessibility for selecting nodes and opening details drawer — Tab to interactive nodes (visible focus ring, `aria-label`), Enter/Space opens the drawer and focuses its heading, Escape closes it and returns focus to the node; arrow-key node moves now persist (one undo step per keyup); Vue Flow's Backspace delete disabled so deletes always go through the store
  - [x] Edge "+" quick-add buttons (`FlowAddEdge.vue`) are real `<button>`s with descriptive `aria-label`s ("Add node after …" / "Insert node between … and …"); edges themselves are no longer tab stops
  - [x] Focusing an off-screen node or "+" button pans the viewport to it (`setCenter` at the current zoom)
- [x] Undo/redo actions on node details or positions updates — snapshot history (`useManualRefHistory`) committed on every `persist()`; nodes are now draggable with positions stored on each node, plus an Auto-align toolbar action
- [x] Responsive check for drawer on smaller viewports — below 768px the drawer is a full-screen overlay (no resize handle, canvas left as is); above that its width is capped so the canvas keeps at least 320px, with the user's preferred width restored once the window grows again
- [x] Full lint + typecheck + test pass (`pnpm lint`, `pnpm typecheck`, `pnpm test`)
- [x] Final Vercel deploy & smoke test of golden path (create → view → edit → delete)

---

## Open Items / Pending Input

- [x] JSON payload structure — added above (see Data Model)
- [x] `trigger` nodes — out of scope for MVP editing; display-only root on canvas
- [x] Timezone field — select field listing all timezones
- [x] Node deletion behavior — cascades to all downstream descendants
- [x] New node `id` generation — conforms to the existing 6-character hex-string style (e.g. `b6a0c1`)
- [x] Description field — added to schema as optional `description: string` on every node; mock schema (used for e2e testing) must populate it on all sample nodes
- [x] Attachment upload — handled via a Vercel Serverless Function that uploads to Vercel Blob and returns the CDN URL, stored in `payload[].attachment`; the mock flow JSON is itself hosted on Vercel Blob and updated in place on every mutation
