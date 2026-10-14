# Vue.js Project Instructions

## Tech Stack & Architecture
- **Framework:** Vue 3 (Latest stable releases)
- **Language:** TypeScript (`<script setup lang="ts">`)
- **State Management:** Pinia (Prefer Setup Stores over Option Stores)
- **Styling:** Tailwind CSS
- **Build Tool:** Vite

## Critical Vue Conventions
- **API Style:** Always use the Composition API with `<script setup>`. Never write Options API unless modifying legacy components.
- **Reactivity:** 
  - Prefer `ref()` over `reactive()` for local primitive and object state to maintain clear reactivity tracking.
  - Utilize `defineModel()` for two-way component bindings (Stable since Vue 3.4). Do not use manual prop + emit pairs for v-model.
  - Use `defineProps` destructure with default values (e.g., `const { count = 0 } = defineProps<{ count?: number }>()`) which is stabilized in Vue 3.5.
- **Template Refs:** Use the `useTemplateRef(key)` composable introduced in Vue 3.5 instead of assigning matching string names directly to standard refs.
- **Unique IDs:** For accessibility attributes and form matching, use the `useId()` composable to guarantee SSR and hydration consistency.
- **Watchers:** Clean up side effects inside watchers using `onWatcherCleanup(fn)` instead of the old parameter callback pattern.

## Styling Guardrails (Tailwind CSS)
- Prefer inline utility classes for local component layouts to preserve rapid styling context.
- Limit `.css` file extraction using `@apply` or `@utility` strictly to global design primitives (e.g., `.btn-primary`, `.form-input`).
- Never create arbitrary CSS classes just to shorten long template class strings.

## Code Style & Structure
- **SFC Tag Order:** Structure Single File Components consistently: `<script setup>`, `<template>`, then `<style scoped>`.
- **Event Listeners:** Never use deprecated `@vnodeXXX` listeners. Always use `@vue:XXX` compiler-approved equivalents (e.g., `@vue:mounted`).
- **Async Components:** If lazy hydration is needed, explicitly declare strategies like `hydrateOnVisible()` or `hydrateOnInteraction()` inside `defineAsyncComponent`.

## Reusability & Structure
- **Composables:** Extract any reactive logic shared across 2+ components (or logic unrelated to rendering) into a `useX()` composable under `composables/`, rather than duplicating it in `<script setup>` blocks.
- **Utility Functions:** Extract pure, non-reactive logic (formatting, calculations, parsing, validation) into plain functions under `utils/`. Keep them framework-agnostic (no Vue imports) so they're trivially unit-testable.
- **Shared Components:** When markup/behavior repeats across views, extract a dedicated component instead of copy-pasting. Keep shared/presentational components free of page-specific business logic; pass data via props and emit events rather than reaching into parent or global state directly.
- **Single Responsibility:** Before adding a new composable, utility, or component, check whether an existing one already covers the need or can be generalized with a parameter, rather than creating a near-duplicate.

## Testing Requirements
- **Coverage Expectation:** Every new composable, utility function, and non-trivial component must have a corresponding unit test. Bug fixes should include a regression test that fails without the fix.
- **Test Framework:** Use Vitest for unit tests and `@vue/test-utils` for component tests. Use Playwright only for E2E flows, not unit-level logic.
- **Test Location:** Co-locate tests next to the source file (`useFoo.ts` + `useFoo.spec.ts`) or mirror the structure under `tests/` if that's the existing project convention — check before introducing a new pattern.
- **What to Test:**
  - Utils/composables: test inputs/outputs and edge cases directly, independent of any component.
  - Components: test rendered output and emitted events for user-facing behavior, not implementation details (avoid asserting on internal state/refs).
- **Mocking:** Mock external dependencies (API calls, stores, router) at the boundary; don't mock the unit under test itself.
- **Before Finalizing:** New or changed logic without a passing test is not considered done.

## Dev & Verification Workflow
- **Package Manager:** Use `pnpm` exclusively (do not mix with npm/yarn).
- **Run Dev Server:** `pnpm dev`
- **Lint & Format:** Run `pnpm lint` and `pnpm typecheck` before finalizing tasks.
- **Testing:** Execute unit/component tests via `pnpm test` and E2E tests via `pnpm test:e2e`. Verify all Vitest or Playwright assertions pass before declaring a task complete.
