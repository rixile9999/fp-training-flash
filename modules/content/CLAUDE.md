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
- Skills and notes are not versioned: upserted on import, retired when removed (not listed, still readable).
- The loader never fails fast: every problem becomes a `ContentIssue { path, message }` with a path relative
  to the content root. A bundle is produced only when there are zero issues.

## Layout

```text
src/index.ts            composition root: createContentModule, migrations, ContentAdmin
src/bundle.ts           loadDirectory -> opaque ContentBundle (parsed data kept in a WeakMap; only bundles
                        created by this module in this process can be imported)
src/loader/tree.ts      reads a directory into a sorted in-memory tree (skips dot files)
src/loader/schemas.ts   zod schemas (strict: unknown keys are issues)
src/loader/parse.ts     validation, family->variant merge, cross references, ParsedVariant building
src/loader/gleam.ts     `pub fn` detection and body extraction (skips strings and // comments)
src/loader/hash.ts      variant hash (family.yaml + variant files, root-independent) and bundle hash
src/loader/frontmatter.ts  YAML front matter splitter for notes
src/db/migrations.ts    schema content: skills, concept_notes, theory_topics, exercise_versions, variants, bundles
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
- Stray files are issues: a family dir holds only `family.yaml` + variant dirs; a variant dir only
  `exercise.yaml`, `prompt.md`, `explanation.md` and (not predict) `starter/ solution/ test/ support/ wrong/`.

## File mapping

starter -> `src/<module>.gleam`; support/*.gleam -> `src/*` (in both starterFiles and supportFiles);
test/** -> `test/**` (GradingSpec.testFiles, all files); solution and wrong/<key> -> `src/<module>.gleam`.

## Testing

`pnpm check:module @fp/content`. Tests in `test/`:
- `loader.test.ts`: real repo `/content` (`../../../content`), temp trees from `test/fixtures.ts`
  (`baseFiles()` is a valid tree with an implement variant and a predict variant; mutate it per test).
- `module.test.ts`: in-memory PGlite, recording event bus, fixed clock; versioning, retirement, idempotency,
  rollback, filters and hidden-data checks.

## Gotchas

- Bump `CONTENT_FORMAT_VERSION` in `hash.ts` when the loader's interpretation of files changes; otherwise
  existing variants keep old stored JSON under an unchanged hash.
- `listExercises({ skill })` filters on the primary skill only.
- Changing `family.yaml` changes the hash (and version) of every variant of that family; editing a concept
  note or theory topic does not bump any exercise version.
