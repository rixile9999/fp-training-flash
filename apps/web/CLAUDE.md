# @fp/web — training UI

React 19 + Vite + CodeMirror 6. UI in ko (default) / en / zh. Talks to the backend only through `createApiClient` from
`@fp/api-contract` (never import module contracts or `@fp/kernel` values: the kernel pulls in `node:crypto`).
Nested module types are derived from the DTOs in `src/api/types.ts`.

## Run

- `pnpm --filter @fp/web dev` — needs apps/api at `VITE_API_URL` (default `http://localhost:8787`).
- `VITE_FAKE_API=1 pnpm --filter @fp/web dev` — in-memory fake (`src/api/fake.ts`), no backend needed.
- `pnpm check:module @fp/web` — boundaries, context budget, typecheck (own tsconfig: DOM, react-jsx,
  bundler resolution), vitest + jsdom.

## Layout

- `main.tsx` awaits `loadApiFactory(import.meta.env)` (fake API = lazy chunk, absent from production), wires it,
  `browserStore()` and the wall clock into `App`.
- `App.tsx` owns the locale (localStorage `fp.locale`, `<html lang>`), auth (`fp.auth`), the tab (`course` | `training` |
  `progress`), the course route (`course.ts` `CourseRoute`: map, unit, lesson + focus, checkpoint, placement; kept across
  tabs, re-selecting 강의 or leaving via "훈련으로 가기" returns to the map), the active session, item index, UI phase
  (`work` | `feedback`), the completed-session summary and recent sessions (`fp.recentSessions`).
- `session.ts` maps session items + phase onto the 5-step stepper (review, focus, feedback, variation, wrapup).
- `i18n/`: dependency-free i18n. `messages.ts` is the ONE catalog (`id -> { ko, en, zh }`, `{name}` placeholders,
  no plurals: phrase en/zh so one template fits any count; terms from docs/i18n-glossary.md). `locale.ts` mirrors
  the kernel helpers (Locale, SUPPORTED_LOCALES, isLocale, pickLocale, formatMessage) since kernel values are off
  limits. `translator.ts`: `translator(locale)` -> `t(id, params)`, Intl `date`/`percent`/`number`/`relativeDay`,
  `list`; missing en/zh falls back to ko, unknown ids render as the id. `I18n.tsx`: `<I18nProvider>` + `useI18n()`
  (Korean without a provider, so isolated component tests stay Korean). Never hard-code UI text in components.
- `screens/`: `Login`, `Training` (start card, workspace, summary), `ProblemPanel` (+ `HintPanel`),
  `EditorPanel`, `CoachPanel` (chat), `FeedbackView` (3 layers, rating, coach feedback, explanation),
  `Progress`, `Course` (holds `CourseView`, `refresh()`; map, unit view), `Lesson` (`LessonPlayer`, shared `Choice`,
  `ItemHead`), `Quiz` (`QuizRunner` one item at a time, `ReviewList` + backlinks, checkpoint and placement screens).
- `ui/`: small presentational pieces (inline stroke `Icon`, `Disclosure`, safe `Markdown` subset, `CodeBlock`,
  `StatusBadge`, `Alert`, `RangeBar`, `RatingLine`, enum `labels`, `LanguageSwitcher`, `PageTitle` (h1 focused on mount),
  `BackLink`). `styles.css` holds all styling; tokens on `:root`.
- `editor/gleam.ts`: StreamLanguage Gleam tokenizer shared by the CodeMirror editor and static code blocks
  (`highlightGleam`), styled via `tok-*` classes.
- `api/fake.ts` + `api/fake-data.ts`: fake client (content stays Korean except skill names; supports `updateMe` and
  `User.locale`) with the coupon exercise family, grading simulated by regex
  rules on the code, rating rules mirroring the real policy (first attempt, hint <= 2, no explanation).
- `api/fake-lessons.ts`: fake course routes (checkpoint: 8 items, pass 80%; placement: 12 items, >= 80% advanced ->
  all units passed + "training", >= 50% intermediate -> level 1). Data: `api/generated/fake-lessons.ts` (all titles,
  full u01 + u02 lessons in ko/en/zh), converted once from content/lessons; outside the context budget.

## Invariants

- Locale: a locale stored in this browser wins (sent with dev-login, pushed with `updateMe` if the account differs);
  without one the account's locale is adopted. Switching changes the chrome at once, calls `api.updateMe`, then
  bumps `contentKey` so exercise, skills, progress and coach feedback are refetched (the learner's code is kept).
- zh uses Noto Sans SC (`html:lang(zh)` swaps `--font-ui`). Longer en labels: the header stepper hides non-current
  step labels per locale via container queries (thresholds measured at 1440px); re-measure when labels change.
- Evaluation (correctness, requirements, code-quality rubric) renders as soon as `submit` resolves. Coaching is
  fetched separately with `feedback()` and shows a loading state; it must never block results.
- Code quality is labelled "정답 판정과 레이팅에 반영하지 않음". Rating shows before -> after, 잠정, "첫 제출만 반영합니다".
- Note panels (코딩 개념 노트 / 이론 노트) are folded by default; the first open calls `noteOpened` once per note.
- Hints are revealed strictly in order (`revealHint(level = shown + 1)`); "힌트 사용은 감점하지 않고 기록만 합니다".
- The full explanation needs an explicit confirm (mastery is re-checked on a new exercise).
- Each new code text gets a fresh idempotency key; a retry of the same code after a network error reuses it.
- Pass/fail is always icon + label, never colour alone. Buttons >= 44px, visible `:focus-visible` outline.
- Every localStorage access goes through `KeyValueStore` (never throws).
- Course: only the server judges answers. Choices: correct = blue + check + "정답", wrong = orange + x + "오답" (kept on
  retry); 정답 보기 (`giveUp`) is not solved. Blocks show up to the first unresolved exercise (all when completed or via
  a backlink). Quizzes: no feedback before submit, unanswered = `null`. A language switch refetches course and lesson
  text; shown feedback and a running quiz keep their language. The package is at the 120k context budget.

## Tests (`test/`)

- `helpers.ts`: `spyApi()` wraps the fake in `vi.fn` spies; `deferred()` to hold `feedback()` open.
- Component tests use Testing Library + user-event. To edit code in the real editor use
  `EditorView.findFromDOM(await screen.findByRole("textbox", { name: /코드 편집기/ }))` and `dispatch` (the view
  is created in an effect). Queries use the Korean catalog text; `test/i18n.test.tsx` covers en/zh and fallback.
- `user.type` treats `[` as a key descriptor; use `user.paste` for Gleam list literals.

## Gotchas

- Fast refresh: files exporting helpers next to components (e.g. `parseExpectedActual`) do a full reload,
  which resets the fake's in-memory state (the stored token survives; the fake accepts any token).
- JetBrains Mono ligatures are disabled in code so `->` and `|>` read as typed.
- Session item status comes from the server; after a submit the workspace refetches the session and offers
  "다음 문제" only once the server advanced `currentIndex`.
