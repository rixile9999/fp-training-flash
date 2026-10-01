import { appError, createEvent, err, ok, type AppError, type Clock, type Db, type EventBus, type ExerciseId, type Logger, type Result } from "@fp/kernel";
import { parsedContentOf, type ContentBundle } from "../bundle.ts";
import { CONTENT_EVENTS, type BundleImportedPayload, type BundleInfo } from "../contract/index.ts";
import { materialize, type ParsedContent } from "../loader/parse.ts";
import { currentBundle } from "./catalog.ts";

export interface ImporterDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly events: EventBus;
  readonly logger: Logger;
}

interface VariantRow {
  family_id: string;
  variant_key: string;
  latest_version: number;
  content_hash: string;
  retired: boolean;
}

/**
 * Imports a loaded bundle in one transaction and publishes content.bundle_imported after commit.
 * Re-importing the bundle that is already current is a no-op (no event).
 */
export async function importBundle(deps: ImporterDeps, bundle: ContentBundle): Promise<Result<BundleInfo, AppError>> {
  const parsed = parsedContentOf(bundle);
  if (!parsed) return err(appError("invalid_input", "bundle was not produced by loadDirectory of this module"));

  const outcome = await deps.db.transaction(async (tx) => {
    // Serialise concurrent imports; readers are not blocked.
    await tx.exec("lock table content.bundles in share row exclusive mode");
    const current = await currentBundle(tx);
    if (current && current.contentHash === parsed.contentHash) return { info: current, exerciseIds: null };
    const importedAt = deps.clock.now();
    const exerciseIds = await writeContent(tx, parsed, bundle.bundleId, importedAt);
    await tx.query(
      `insert into content.bundles (bundle_id, content_hash, imported_at, exercise_count, exercise_ids)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [bundle.bundleId, parsed.contentHash, importedAt.toISOString(), exerciseIds.length, JSON.stringify(exerciseIds)],
    );
    const info: BundleInfo = {
      bundleId: bundle.bundleId,
      contentHash: parsed.contentHash,
      importedAt: importedAt.toISOString(),
      exerciseCount: exerciseIds.length,
    };
    return { info, exerciseIds };
  });

  if (outcome.exerciseIds === null) {
    deps.logger.info("content bundle already current", { bundleId: outcome.info.bundleId });
    return ok(outcome.info);
  }
  const payload: BundleImportedPayload = {
    bundleId: outcome.info.bundleId,
    contentHash: outcome.info.contentHash,
    exerciseIds: outcome.exerciseIds,
  };
  await deps.events.publish(createEvent(CONTENT_EVENTS.bundleImported, payload, deps.clock));
  deps.logger.info("content bundle imported", { bundleId: payload.bundleId, exercises: payload.exerciseIds.length });
  return ok(outcome.info);
}

/** Writes skills, notes and exercise versions. Returns the current exercise ids of the bundle. */
async function writeContent(tx: Db, parsed: ParsedContent, bundleId: string, importedAt: Date): Promise<ExerciseId[]> {
  for (const skill of parsed.skills) {
    await tx.query(
      `insert into content.skills (id, sort_order, data, translations, retired) values ($1, $2, $3::jsonb, $4::jsonb, false)
       on conflict (id) do update
         set sort_order = excluded.sort_order, data = excluded.data, translations = excluded.translations, retired = false`,
      [skill.id, skill.order, JSON.stringify(skill), JSON.stringify(parsed.translations.skills.get(skill.id) ?? {})],
    );
  }
  await retireMissing(tx, "skills", parsed.skills.map((s) => s.id));
  await replaceNotes(tx, "concept_notes", parsed.conceptNotes, parsed.translations.conceptNotes);
  await replaceNotes(tx, "theory_topics", parsed.theoryTopics, parsed.translations.theoryTopics);
  await replaceLessons(tx, parsed);

  const existing = await tx.query<VariantRow>(
    "select family_id, variant_key, latest_version, content_hash, retired from content.variants",
  );
  const byKey = new Map(existing.rows.map((r) => [`${r.family_id}/${r.variant_key}`, r]));
  const seen = new Set<string>();
  const ids: ExerciseId[] = [];

  for (const v of parsed.variants) {
    const key = `${v.familyId}/${v.variantKey}`;
    seen.add(key);
    const prev = byKey.get(key);
    if (prev && prev.content_hash === v.contentHash) {
      if (prev.retired) {
        await tx.query("update content.variants set retired = false where family_id = $1 and variant_key = $2", [
          v.familyId,
          v.variantKey,
        ]);
      }
      ids.push(materialize(v, prev.latest_version).id);
      continue;
    }
    const version = prev ? prev.latest_version + 1 : 1;
    const m = materialize(v, version);
    await tx.query(
      `insert into content.exercise_versions
         (id, family_id, variant_key, version, content_hash, language, kind, format, primary_skill,
          summary, detail, grading, reference, translations, bundle_id, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16)`,
      [
        m.id,
        v.familyId,
        v.variantKey,
        version,
        v.contentHash,
        m.summary.language,
        m.summary.kind,
        m.summary.format,
        m.summary.primarySkill,
        JSON.stringify(m.summary),
        JSON.stringify(m.detail),
        JSON.stringify(m.grading),
        JSON.stringify(m.reference),
        JSON.stringify(v.translations),
        bundleId,
        importedAt.toISOString(),
      ],
    );
    await tx.query(
      `insert into content.variants (family_id, variant_key, latest_version, content_hash, retired)
       values ($1, $2, $3, $4, false)
       on conflict (family_id, variant_key)
       do update set latest_version = excluded.latest_version, content_hash = excluded.content_hash, retired = false`,
      [v.familyId, v.variantKey, version, v.contentHash],
    );
    ids.push(m.id);
  }

  for (const [key, row] of byKey) {
    if (seen.has(key) || row.retired) continue;
    await tx.query("update content.variants set retired = true where family_id = $1 and variant_key = $2", [
      row.family_id,
      row.variant_key,
    ]);
  }
  return ids;
}

/** Upserts every note and retires notes that are no longer in the bundle. */
async function replaceNotes(
  tx: Db,
  table: "concept_notes" | "theory_topics",
  notes: readonly { readonly id: string }[],
  translations: ReadonlyMap<string, object>,
): Promise<void> {
  for (const n of notes) {
    await tx.query(
      `insert into content.${table} (id, data, translations, retired) values ($1, $2::jsonb, $3::jsonb, false)
       on conflict (id) do update set data = excluded.data, translations = excluded.translations, retired = false`,
      [n.id, JSON.stringify(n), JSON.stringify(translations.get(n.id) ?? {})],
    );
  }
  await retireMissing(tx, table, notes.map((n) => n.id));
}

/** Upserts every unit and lesson; retires units and lessons that are no longer in the bundle. */
async function replaceLessons(tx: Db, parsed: ParsedContent): Promise<void> {
  const lessonKeys: string[] = [];
  for (const u of parsed.lessonUnits) {
    await tx.query(
      `insert into content.lesson_units (id, sort_order, data, translations, retired) values ($1, $2, $3::jsonb, $4::jsonb, false)
       on conflict (id) do update
         set sort_order = excluded.sort_order, data = excluded.data, translations = excluded.translations, retired = false`,
      [u.unit.id, u.unit.order, JSON.stringify(u.unit), JSON.stringify(u.translations)],
    );
    for (const [position, l] of u.lessons.entries()) {
      lessonKeys.push(`${u.unit.id}/${l.lesson.id}`);
      await tx.query(
        `insert into content.lessons (unit_id, lesson_id, position, data, answers, translations, retired)
         values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, false)
         on conflict (unit_id, lesson_id) do update
           set position = excluded.position, data = excluded.data, answers = excluded.answers,
               translations = excluded.translations, retired = false`,
        [u.unit.id, l.lesson.id, position, JSON.stringify(l.lesson), JSON.stringify(l.answers), JSON.stringify(l.translations)],
      );
    }
  }
  await retireMissing(tx, "lesson_units", parsed.lessonUnits.map((u) => u.unit.id));
  await tx.query(
    "update content.lessons set retired = true where not retired and not ((unit_id || '/' || lesson_id) = any($1::text[]))",
    [lessonKeys],
  );
}

async function retireMissing(
  tx: Db,
  table: "skills" | "concept_notes" | "theory_topics" | "lesson_units",
  keep: readonly string[],
): Promise<void> {
  await tx.query(`update content.${table} set retired = true where not retired and not (id = any($1::text[]))`, [keep]);
}
