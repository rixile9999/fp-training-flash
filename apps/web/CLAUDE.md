# @fp/web — training UI

React 19 + Vite + CodeMirror 6. Korean UI. Talks to the backend only through `createApiClient` from
`@fp/api-contract` (never import module contracts or `@fp/kernel` values: the kernel pulls in `node:crypto`).
Nested module types are derived from the DTOs in `src/api/types.ts`.

## Run

- `pnpm --filter @fp/web dev` — needs apps/api at `VITE_API_URL` (default `http://localhost:8787`).
- `VITE_FAKE_API=1 pnpm --filter @fp/web dev` — in-memory fake (`src/api/fake.ts`), no backend needed.
- `pnpm check:module @fp/web` — boundaries, context budget, typecheck (own tsconfig: DOM, react-jsx,
  bundler resolution), vitest + jsdom.

## Layout

- `main.tsx` awaits `loadApiFactory(import.meta.env)` (the fake API is a lazily loaded chunk, absent from production bundles), then wires it, `browserStore()` and the wall clock into `App`.
- `App.tsx` owns auth (localStorage key `fp.auth`), the active session, the active item index, the UI phase
  (`work` | `feedback`), the completed-session summary and recent sessions (`fp.recentSessions`).
- `session.ts` maps session items + phase onto the 5-step stepper (복습, 집중 훈련, 피드백·재제출, 변형 적용, 마무리).
- `screens/`: `Login`, `Training` (start card, workspace, summary), `ProblemPanel` (+ `HintPanel`),
  `EditorPanel`, `CoachPanel` (chat), `FeedbackView` (3 layers, rating, coach feedback, explanation),
  `Progress`.
- `ui/`: small presentational pieces (inline stroke `Icon`, `Disclosure`, safe `Markdown` subset, `CodeBlock`,
  `StatusBadge`, `RangeBar`, Korean `labels`). `styles.css` holds all styling; tokens on `:root`.
- `editor/gleam.ts`: StreamLanguage Gleam tokenizer shared by the CodeMirror editor and static code blocks
  (`highlightGleam`), styled via `tok-*` classes.
- `api/fake.ts` + `api/fake-data.ts`: fake client with the coupon exercise family, grading simulated by regex
  rules on the code, rating rules mirroring the real policy (first attempt, hint <= 2, no explanation).

## Invariants

- Evaluation (correctness, requirements, code-quality rubric) renders as soon as `submit` resolves. Coaching is
  fetched separately with `feedback()` and shows a loading state; it must never block results.
- Code quality is labelled "정답 판정과 레이팅에 반영하지 않음". Rating shows before -> after, 잠정, "첫 제출만 반영합니다".
- Note panels (코딩 개념 노트 / 이론 노트) are folded by default; the first open calls `noteOpened` once per note.
- Hints are revealed strictly in order (`revealHint(level = shown + 1)`); "힌트 사용은 감점하지 않고 기록만 합니다".
- The full explanation needs an explicit confirm (mastery is re-checked on a new exercise).
- Each new code text gets a fresh idempotency key; a retry of the same code after a network error reuses it.
- Pass/fail is always icon + label, never colour alone. Buttons >= 44px, visible `:focus-visible` outline.
- Every localStorage access goes through `KeyValueStore` (never throws).

## Tests (`test/`)

- `helpers.ts`: `spyApi()` wraps the fake in `vi.fn` spies; `deferred()` to hold `feedback()` open.
- Component tests use Testing Library + user-event. To edit code in the real editor use
  `EditorView.findFromDOM(screen.getByRole("textbox", { name: /코드 편집기/ }))` and `dispatch`.
- `user.type` treats `[` as a key descriptor; use `user.paste` for Gleam list literals.

## Gotchas

- Fast refresh: files exporting helpers next to components (e.g. `parseExpectedActual`) do a full reload,
  which resets the fake's in-memory state (the stored token survives; the fake accepts any token).
- JetBrains Mono ligatures are disabled in code so `->` and `|>` read as typed.
- Session item status comes from the server; after a submit the workspace refetches the session and offers
  "다음 문제" only once the server advanced `currentIndex`.
