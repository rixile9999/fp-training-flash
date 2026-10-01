import type { Db, Locale } from "@fp/kernel";
import type {
  BundleInfo,
  ConceptNote,
  ContentCatalog,
  ExerciseDetail,
  ExerciseSummary,
  GradingSpec,
  ReferenceMaterial,
  Skill,
  TheoryTopic,
} from "../contract/index.ts";
import {
  localizeConceptNote,
  localizeDetail,
  localizeGrading,
  localizeReference,
  localizeSkill,
  localizeSummary,
  localizeTheoryTopic,
  overlayFor,
  type NoteText,
  type SkillText,
  type Translations,
  type VariantText,
} from "../i18n.ts";

/** jsonb comes back parsed from both pg and PGlite; tolerate a string just in case. */
function json<T>(value: unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

export async function currentBundle(db: Db): Promise<BundleInfo | null> {
  const r = await db.query<{ bundle_id: string; content_hash: string; imported_at: Date | string; exercise_count: number }>(
    "select bundle_id, content_hash, imported_at, exercise_count from content.bundles order by seq desc limit 1",
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    bundleId: row.bundle_id,
    contentHash: row.content_hash,
    importedAt: new Date(row.imported_at).toISOString(),
    exerciseCount: Number(row.exercise_count),
  };
}

type Localize<T, O> = (value: T, overlay: O | undefined) => T;

/** One stored object plus its translations, localized to `locale` (Korean when absent or untranslated). */
function localized<T, O>(row: { value: unknown; translations: unknown }, locale: Locale | undefined, f: Localize<T, O>): T {
  return f(json<T>(row.value), overlayFor(json<Translations<O> | null>(row.translations), locale));
}

async function exerciseColumn<T>(
  db: Db,
  column: "detail" | "grading" | "reference",
  id: string,
  locale: Locale | undefined,
  f: Localize<T, VariantText>,
): Promise<T | null> {
  const r = await db.query<{ value: unknown; translations: unknown }>(
    `select ${column} as value, translations from content.exercise_versions where id = $1`,
    [id],
  );
  const row = r.rows[0];
  return row ? localized(row, locale, f) : null;
}

/** Returns notes in the order of `ids`, skipping unknown ids and duplicates. Retired notes stay readable. */
async function notesById<T>(
  db: Db,
  table: "concept_notes" | "theory_topics",
  ids: readonly string[],
  locale: Locale | undefined,
  f: Localize<T, NoteText>,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const r = await db.query<{ id: string; value: unknown; translations: unknown }>(
    `select id, data as value, translations from content.${table} where id = any($1::text[])`,
    [[...ids]],
  );
  const byId = new Map(r.rows.map((row) => [row.id, localized(row, locale, f)]));
  const out: T[] = [];
  for (const id of new Set(ids)) {
    const note = byId.get(id);
    if (note !== undefined) out.push(note);
  }
  return out;
}

export function createCatalog(db: Db): ContentCatalog {
  return {
    async listSkills(locale) {
      const r = await db.query<{ value: unknown; translations: unknown }>(
        "select data as value, translations from content.skills where not retired order by sort_order, id",
      );
      return r.rows.map((row) => localized<Skill, SkillText>(row, locale, localizeSkill));
    },

    async getSkill(id, locale) {
      const r = await db.query<{ value: unknown; translations: unknown }>(
        "select data as value, translations from content.skills where id = $1",
        [id],
      );
      const row = r.rows[0];
      return row ? localized<Skill, SkillText>(row, locale, localizeSkill) : null;
    },

    async listExercises(filter = {}, locale) {
      const where = ["not v.retired"];
      const params: unknown[] = [];
      const eq = (column: string, value: string | undefined) => {
        if (value === undefined) return;
        params.push(value);
        where.push(`e.${column} = $${params.length}`);
      };
      eq("language", filter.language);
      eq("primary_skill", filter.skill);
      eq("kind", filter.kind);
      eq("format", filter.format);
      eq("family_id", filter.familyId);
      const r = await db.query<{ value: unknown; translations: unknown }>(
        `select e.summary as value, e.translations from content.variants v
         join content.exercise_versions e
           on e.family_id = v.family_id and e.variant_key = v.variant_key and e.version = v.latest_version
         where ${where.join(" and ")}
         order by e.family_id, e.variant_key`,
        params,
      );
      return r.rows.map((row) => localized<ExerciseSummary, VariantText>(row, locale, localizeSummary));
    },

    getExercise: (id, locale) => exerciseColumn<ExerciseDetail>(db, "detail", id, locale, localizeDetail),
    getGradingSpec: (id, locale) => exerciseColumn<GradingSpec>(db, "grading", id, locale, localizeGrading),
    getReferenceMaterial: (id, locale) => exerciseColumn<ReferenceMaterial>(db, "reference", id, locale, localizeReference),
    getConceptNotes: (ids, locale) => notesById<ConceptNote>(db, "concept_notes", ids, locale, localizeConceptNote),
    getTheoryTopics: (ids, locale) => notesById<TheoryTopic>(db, "theory_topics", ids, locale, localizeTheoryTopic),

    async listTheoryTopics(locale) {
      const r = await db.query<{ value: unknown; translations: unknown }>(
        "select data as value, translations from content.theory_topics where not retired order by id",
      );
      return r.rows.map((row) => localized<TheoryTopic, NoteText>(row, locale, localizeTheoryTopic));
    },

    // Lessons (docs/design/lessons.md): placeholders until the lesson loader lands.
    async listLessonUnits() {
      return [];
    },
    async getLesson() {
      return null;
    },
    async getLessonAnswer() {
      return null;
    },

    currentBundle: () => currentBundle(db),
  };
}
