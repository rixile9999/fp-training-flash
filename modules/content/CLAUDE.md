# @fp/content — module guide

The problem DB. Loads the authored `/content` tree (format: `content/README.md`), validates it, imports it as
an immutable, versioned bundle into schema `content`, and serves it through `ContentCatalog`
(`src/contract/index.ts`, do not change without a contract task).

## Invariants

- `ExerciseDetail` (learner view) never contains hidden tests, test files, solutions, explanations or wrong
  answers. `publicTests[].code` is only the body of each *public* test fn, cut from its test file.
- Exercise ids are `<family>/<variant>@<version>`. Rows in `content.exercise_versions` are never updated or
  deleted, so every id ever issued stays readable (`getExercise`/`getGradingSpec`/`getReferenceMaterial`).
- Version rule (per variant, by content hash): unchanged -> same id; changed -> latest+1; missing from the
  bundle -> `variants.retired = true` (hidden from `listExercises`, still readable by id); coming back
  unchanged -> un-retired with the same id.
- Import is one transaction (serialised by a table lock on `content.bundles`); `content.bundle_imported` is
  published only after commit. Re-importing the *current* bundle hash is a no-op (no event, same BundleInfo).
  Re-importing an older bundle after a newer one is a real import (changed variants get new versions).
- Skills, notes, lessons and recall decks/cards are not versioned: upserted on import, retired when removed (not
  listed, still readable by id).
- `Lesson` (getLesson) never contains answers or feedback: they live in `content.lessons.answers` and are served
  only by `getLessonAnswer` (server side, lessons module). `localizeLesson` rebuilds blocks field by field.
- `RecallCard` (listRecallCards/getRecallCard) never contains answers, expected values, checks, the reference body,
  mustUse or feedback: they live in `content.recall_cards.key` and are served only by `getRecallCardKey` (server
  side, recall module). `localizeRecallCard` rebuilds the card field by field.
- Localization (content/README.md "Localization"): Korean is stored as the contract objects; en/zh overlays
  (`src/i18n.ts` types) are stored in a `translations` jsonb column next to them and applied by the catalog
  field by field (missing -> Korean). No locale / "ko" returns exactly the Korean objects.
- The loader never fails fast: every problem becomes a `ContentIssue { path, message }` with a path relative
  to the content root. A bundle is produced only when there are zero issues.

## Layout

```text
src/index.ts            composition root: createContentModule, migrations, ContentAdmin
src/bundle.ts           loadDirectory -> opaque ContentBundle (parsed data kept in a WeakMap; only bundles
                        created by this module in this process can be imported)
src/loader/tree.ts      reads a directory into a sorted in-memory tree (skips dot files)
src/loader/schemas.ts   zod schemas (strict: unknown keys are issues)
src/i18n.ts             overlay types (SkillText, NoteText, VariantText, UnitText, LessonText, RecallDeckText,
                        RecallCardText), stored types (StoredLessonUnit, StoredLessonAnswer, StoredRecallDeck) and
                        localize* functions for the catalog
src/loader/parse.ts     validation, family->variant merge, cross references, ParsedVariant building
src/loader/translations.ts  *.<locale>.* overlays: parsing, key checks against Korean, locales (rule 4)
src/loader/lessons.ts   content/lessons: unit.yaml, <lesson>.yaml, overlays, gaps/locales (see "Lessons")
src/loader/recall.ts    content/recall: decks.yaml, <deck>/<card>.yaml, overlays, gaps/locales (see "Recall")
src/loader/graph.ts     findCycle (skill and unit prerequisites)
src/loader/yaml.ts      parseYaml + validate (unknown keys reported, then checks continue)
src/loader/gleam.ts     `pub fn` detection, body extraction, codeOnly (skips strings and // comments)
src/loader/hash.ts      variant hash (family.yaml, family.<l>.yaml + variant files incl. translations) and bundle hash
                        (every file of the tree, lessons and recall included, + BUNDLE_FORMAT_VERSION)
src/loader/frontmatter.ts  YAML front matter splitter for notes
src/db/migrations.ts    schema content: skills, concept_notes, theory_topics, exercise_versions, variants, bundles
                        (0002: `translations` jsonb on skills, notes, topics, exercise_versions;
                        0003: lesson_units, lessons {data = Korean Lesson, answers, translations, position};
                        0004: recall_decks, recall_cards {deck_id, sort_order, data = Korean RecallCard,
                        key = Korean RecallCardKey, translations})
src/db/importer.ts      importBundle
src/db/catalog.ts       ContentCatalog over the tables (JSONB columns hold the contract objects verbatim)
```

## Validation highlights (parse.ts)

- ids kebab-case (skills, notes = file name = front matter id, families, variants, wrong keys).
- References: primary/secondary skills, conceptNotes, theoryTopics, theory relatedSkills, skill prerequisites
  (plus cycle detection), test `requirements` ids, `wrong.mustFail` fns must be listed tests.
- Hints: exactly levels 1..5, kinds in order question, concept, approach, partial_code, explanation.
- Code exercises: `module` required; `starter/`, `solution/`, `wrong/<key>/` contain exactly `<module>.gleam`;
  `test/<module>_test.gleam` exists; every listed test fn is `pub fn <fn>(` in some test file; at least one
  public test; implement/fix need at least one wrong answer; `wrong/` dirs and entries match 1:1;
  `performance.module` file exists, sizes ascending, `referenceCost` (optional, default []) one per size.
- Predict: needs `predict {code, acceptedAnswers}`; module/tests/wrong not required.
- Stray files are issues: a family dir holds only `family.yaml`, `family.<l>.yaml` + variant dirs; a variant dir
  only `exercise.yaml`, `prompt.md`, `explanation.md`, their `.<l>.` siblings and (not predict)
  `starter/ starter.<l>/ solution/ test/ support/ wrong/`.

## Translations (loader/translations.ts)

- Files: `skills.<l>.yaml`, `concepts|theory/<id>.<l>.md` (front matter id + title only), `family.<l>.yaml`,
  `exercise.<l>.yaml`, `prompt|explanation.<l>.md`, `starter.<l>/<module>.gleam`. `<l>` must be en or zh.
- Issues: unknown overlay keys (schema keys, test fns, requirement ids, hint levels, rubric ids of the merged
  rubric; `message` only for items with a pattern check), unknown skill/note ids, starter whose `codeOnly`
  differs from the Korean starter or extra files in `starter.<l>/`.
- Title: `exercise.<l>.yaml` title, else (only when the variant does not override the Korean title) the family
  overlay title. Rubric: variant overlay, else family overlay (only for a rubric inherited from the family).
- `locales`: "ko" + each locale with prompt, explanation, overlay with every test name and hints 1..5, family
  title, the variant title when the variant overrides it (stricter than README rule 4), and a localized starter
  when the Korean starter has Hangul. Partial translations are still served field by field.
- Translation files of a variant (and family.<l>.yaml) are part of its hash: changes bump the version. Skill and
  note translations are not versioned. Rows stored before 0002 have no `locales`; the catalog fills ["ko"].

## Lessons (loader/lessons.ts, docs/design/lessons.md)

- Tree: `lessons/<unit>/unit.yaml`, `<lesson>.yaml`, `unit.<l>.yaml` ({title}), `<lesson>.<l>.yaml`
  ({title?, blocks: {<id>: {markdown? | prompt?, code?, choices?, feedback?: {correct?, choices?: {<i>: text}}}}}).
  No `lessons/` directory = no units. Unit and lesson ids kebab-case.
- unit.yaml: title, order (unique), level 1-4, skill (exists; track `basics` or `explicit-failure`), prerequisites
  (unit ids, not itself, no cycle), lessons (no duplicates, 1:1 with `<lesson>.yaml` files), source. Stray files,
  subdirectories and overlays of unknown lessons are issues.
- Blocks: `{prose, markdown}` | `{exercise, type choice|predict, prompt, code?, choices >= 2 (distinct), answer,
  feedback {correct, choices}}`; block ids unique per lesson; answer in range; `feedback.choices` has exactly one
  entry per wrong choice (not the answer, not out of range); `tags` default [].
- Overlay issues: unknown block id, `answer` present, prose fields on exercises (or vice versa), `code` where the
  Korean block has none, choice count differs, a Hangul-free Korean choice found at another index (reordered =
  changed answer), unknown `feedback.choices` index, locale not en/zh. Localized `code` may differ from Korean.
- Completeness ("gaps", not issues): lesson title; every block; prose markdown; exercise prompt, choices,
  feedback.correct, every feedback choice; localized code when the Korean code contains Hangul; no Hangul left in a
  block or title. `LessonUnitSummary.locales` = ko + locales with the unit title and every lesson complete.
  `lessonTranslationGaps(bundle)` (module root) lists the gaps for content CI. Same rules as
  tools/fpdojo-import/src/check-overlay.ts, plus the Hangul-code rule (that script does not check it).
- Catalog: `listLessonUnits` (by order, not retired; `lessonTitles` from the lesson rows in unit lesson order),
  `getLesson`, `getLessonAnswer` (null for unknown ids or a prose block). en/zh applied field by field
  (choices as a whole, feedback per choice index), Korean fallback.

## Recall (loader/recall.ts, docs/design/recall.md, content/README.md "Recall cards")

- Tree: `recall/decks.yaml` ({decks: [{id, title, description, order}]}, ids and orders unique), `decks.<l>.yaml`
  ({decks: {<id>: {title?, description?}}}), `recall/<deck>/<card-id>.yaml`, `<card-id>.<l>.yaml`. No `recall/`
  directory = no decks. Deck directories must be deck ids (empty decks are fine); card id = file name (kebab-case),
  unique across all decks; `order` (integer) unique per deck. Stray files, subdirectories, unknown locales and
  overlays of unknown cards are issues.
- Card rules (issues): strict keys; `expected` values and cloze answers are YAML strings; recognize 3-4 distinct
  choices, answer in range, `feedback.choices` exactly the wrong indices; `cloze.code` exactly one `____`; answers
  non-empty (trimmed); `produce.header` starts with `pub fn <name>(` and has no `{`; reference contains every
  `mustUse` token; example has a non-empty `// -> value`; imports look like snippet imports (`gleam/list`,
  `gleam/list.{map}`). Whether the code evaluates to the expected values is content CI's job (sandbox).
- Overlay issues: `imports`, `recognize.answer`, `cloze.code|answers|expected`, `predict.code|expected`,
  `produce.header|checks|expected|mustUse|reference` (never translated); other unknown keys; example/definitions
  whose `codeOnly` differs from the Korean; definitions/predict/hint the Korean card lacks; choice count differs or a
  Hangul-free Korean choice moved; unknown `feedback.choices` index.
- Gaps (not issues): summary; recognize prompt, choices, feedback.correct and each feedback choice; cloze, predict
  (if any) and produce prompts; hint if the Korean has one; title when the Korean title has Hangul; example /
  definitions overlay when the Korean code has Hangul outside string literals; Hangul left in prose or in comments.
  `RecallCard.locales` = ko + gap-free locales (RecallDeck has no `locales` in the contract; deck title/description
  gaps are reported only). `recallTranslationGaps(bundle)` (module root) lists card and decks.<l>.yaml gaps.
- Catalog: `listRecallDecks` (by order, not retired, `cardCount` = non-retired cards), `listRecallCards(deckId?)`
  (non-retired, by deck order, card order, id), `getRecallCard`/`getRecallCardKey` (any id, also retired). en/zh
  applied field by field (choices as a whole, feedback per index), Korean fallback. Module root also exports
  `CLOZE_BLANK` and `exampleExpected` for content CI.

## File mapping

starter -> `src/<module>.gleam`; support/*.gleam -> `src/*` (in both starterFiles and supportFiles);
test/** -> `test/**` (GradingSpec.testFiles, all files); solution and wrong/<key> -> `src/<module>.gleam`.

## Testing

`pnpm check:module @fp/content`. Tests in `test/`:
- `loader.test.ts`: real repo `/content` (`../../../content`), temp trees from `test/fixtures.ts`
  (`baseFiles()` is a valid tree with an implement variant and a predict variant; mutate it per test).
- `i18n.test.ts`: overlays, issues, starter override, hash bump, locales, localized catalog with fallback,
  real `/content` in every locale (`translationFiles()` in fixtures adds en (complete) + zh (partial)).
- `module.test.ts`: in-memory PGlite, recording event bus, fixed clock; versioning, retirement, idempotency,
  rollback, filters and hidden-data checks.
- `lessons.test.ts`: `lessonFiles()` fixtures (spread after `baseFiles()`; replaces skills.yaml) with two units,
  en complete / zh partial; loader issues, gaps, hash; catalog in every locale, retirement; real /content
  (15 units, 64 lessons, 150 prose, 228 exercises) served and answered in ko/en/zh.
- `recall.test.ts`: `recallFiles()` fixtures (spread after `baseFiles()`) with decks syntax/stdlib and three cards,
  en complete / zh partial; loader issues, overlay issues, gaps, hash; catalog in every locale, no answer leakage,
  retirement; real /content recall loads without recall issues (no hard-coded card counts: authors add cards).

## Gotchas

- Bump `CONTENT_FORMAT_VERSION` in `hash.ts` when the loader's interpretation of files changes; otherwise
  existing variants keep old stored JSON under an unchanged hash.
- Bump `BUNDLE_FORMAT_VERSION` (bundle hash only; no exercise version changes) when the importer starts storing
  data it ignored before: an unchanged tree would otherwise be skipped as "already current".
- `listExercises({ skill })` filters on the primary skill only.
- Changing `family.yaml` changes the hash (and version) of every variant of that family; editing a concept
  note or theory topic does not bump any exercise version.
