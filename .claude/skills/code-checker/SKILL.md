---
name: code-checker
description: Run deterministic eslint + vue-tsc checks on this Vue/TypeScript project. Use this before declaring any code change finished, after editing or creating .vue/.ts/.js files, or whenever the user asks to lint, typecheck, or verify the code compiles. This runs real commands and reports real pass/fail — never substitute reading the code or guessing whether it would pass.
---

# Code Checker

This project's correctness bar is `pnpm lint` (eslint) and `pnpm typecheck` (vue-tsc) passing — not a visual read of the diff. Run the actual tools; don't eyeball the code and declare it fine.

## When to run this

- After any edit to `.vue`, `.ts`, `.tsx`, or `.js` files, before telling the user the task is done.
- Whenever the user explicitly asks to lint, typecheck, or "check the code."
- Before committing, if a commit is requested.

## How to run it

From the project root (where `package.json` lives), run both checks back to back:

```bash
pnpm lint && pnpm typecheck
```

`pnpm lint` runs `eslint .`; `pnpm typecheck` runs `vue-tsc --noEmit`. Either command exits non-zero on failure — treat a non-zero exit as the task not being done yet, not as something to summarize around.

If you only need one of the two checks (e.g. a pure style/lint fix with no type changes touched), it's fine to run just `pnpm lint` or `pnpm typecheck` — but default to running both when you've touched both logic and types.

## On failure

- Read the actual eslint/vue-tsc output — it names the file and line. Fix the root cause in the source, not by loosening lint rules, adding `// eslint-disable`, or widening types to `any` unless the existing codebase convention already does so for a comparable case.
- Re-run both commands after fixing. Don't declare the task complete until both pass.
- If a failure is pre-existing (unrelated to your change) and fixing it is out of scope, say so explicitly to the user rather than silently ignoring it.
