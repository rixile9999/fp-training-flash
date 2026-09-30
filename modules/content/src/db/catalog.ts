import type { Db } from "@fp/kernel";
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

async function exerciseColumn<T>(db: Db, column: "detail" | "grading" | "reference", id: string): Promise<T | null> {
  const r = await db.query<{ value: unknown }>(`select ${column} as value from content.exercise_versions where id = $1`, [id]);
  const row = r.rows[0];
  return row ? json<T>(row.value) : null;
}

/** Returns notes in the order of `ids`, skipping unknown ids and duplicates. Retired notes stay readable. */
async function notesById<T>(db: Db, table: "concept_notes" | "theory_topics", ids: readonly string[]): Promise<T[]> {
  if (ids.length === 0) return [];
  const r = await db.query<{ id: string; data: unknown }>(`select id, data from content.${table} where id = any($1::text[])`, [
    [...ids],
  ]);
  const byId = new Map(r.rows.map((row) => [row.id, json<T>(row.data)]));
  const out: T[] = [];
  for (const id of new Set(ids)) {
    const note = byId.get(id);
    if (note !== undefined) out.push(note);
  }
  return out;
}

export function createCatalog(db: Db): ContentCatalog {
  return {
    async listSkills() {
      const r = await db.query<{ data: unknown }>("select data from content.skills where not retired order by sort_order, id");
      return r.rows.map((row) => json<Skill>(row.data));
    },

    async getSkill(id) {
      const r = await db.query<{ data: unknown }>("select data from content.skills where id = $1", [id]);
      const row = r.rows[0];
      return row ? json<Skill>(row.data) : null;
    },

    async listExercises(filter = {}) {
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
      const r = await db.query<{ summary: unknown }>(
        `select e.summary from content.variants v
         join content.exercise_versions e
           on e.family_id = v.family_id and e.variant_key = v.variant_key and e.version = v.latest_version
         where ${where.join(" and ")}
         order by e.family_id, e.variant_key`,
        params,
      );
      return r.rows.map((row) => json<ExerciseSummary>(row.summary));
    },

    getExercise: (id) => exerciseColumn<ExerciseDetail>(db, "detail", id),
    getGradingSpec: (id) => exerciseColumn<GradingSpec>(db, "grading", id),
    getReferenceMaterial: (id) => exerciseColumn<ReferenceMaterial>(db, "reference", id),
    getConceptNotes: (ids) => notesById<ConceptNote>(db, "concept_notes", ids),
    getTheoryTopics: (ids) => notesById<TheoryTopic>(db, "theory_topics", ids),

    async listTheoryTopics() {
      const r = await db.query<{ data: unknown }>("select data from content.theory_topics where not retired order by id");
      return r.rows.map((row) => json<TheoryTopic>(row.data));
    },

    currentBundle: () => currentBundle(db),
  };
}
