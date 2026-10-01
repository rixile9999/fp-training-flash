# FP Training Flash

Functional-programming training platform. Learners solve short Gleam exercises, get evidence-based coaching,
and are scheduled by per-skill Elo + spaced review. Product docs: plan.md (requirements), proposal.md (design).
Do not load those for module work; they are not needed to change code.

## Repository rules (enforced by tools, not convention)

- One package = one unit of work and context. Packages: `shared/*` (kernel, api-contract), `modules/*`
  (accounts, content, grading, learner, sessions, coaching), `apps/*` (api, web, mcp, cli), `tools/*`.
- A module is visible to others only through `src/contract/index.ts` (`@fp/<m>/contract`). Only apps/* and
  tools/* may import a module root (`@fp/<m>`), which exposes the factory and migrations.
- Declare every dependency in the package's package.json. pnpm and package "exports" block anything else.
- Each module owns one PostgreSQL schema named after it. Never query another module's schema.
- Cross-module state changes travel as domain events (`<module>.<fact>`); consumers are idempotent.
- Contracts change in their own task, before implementations. Do not edit files outside your task's package.

## Commands

- `./fpctl up|down|restart|reset|status|logs`: run the whole platform locally (see README).
- `pnpm check:module <pkg>`: definition of done for one package (boundaries, context budget, typecheck, tests).
- `pnpm check`: whole repo. `pnpm boundaries`: boundary rules only.
- `node tools/ctx.mjs <pkg>`: the exact files you need for a package (`--tokens` for size, `--cat` to print).

## Code conventions

- TypeScript run directly by Node 25 (type stripping): erasable syntax only (no enums, namespaces,
  parameter properties); relative imports end in `.ts`; `import type` for types.
- Expected failures return `Result<T, AppError>` from `@fp/kernel`; throw only for bugs.
- Time comes from the injected `Clock`, ids from `newId()`; no `Date.now()` in domain logic.
- Tests: vitest in `<pkg>/test/*.test.ts`, in-memory PGlite via `@fp/kernel/testing`. Fake other modules with
  small hand-written objects implementing their contracts.
- User-facing text exists in ko (source), en and zh (Simplified). Each package keeps one message catalog
  (LocalizedText + formatMessage from @fp/kernel); content uses per-locale overlay files (content/README.md).
  Terminology and tone: docs/i18n-glossary.md. Code, identifiers and commit messages are English.
