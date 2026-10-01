/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { AppError, Clock, Db, EventBus, Logger, Result } from "@fp/kernel";
import { loadDirectory, parsedContentOf, type ContentBundle } from "./bundle.ts";
import type { BundleInfo, ContentCatalog } from "./contract/index.ts";
import { createCatalog } from "./db/catalog.ts";
import { importBundle } from "./db/importer.ts";
import { lessonTranslationGaps as gapsOf, type LessonTranslationGap } from "./loader/lessons.ts";
import type { ContentIssue } from "./loader/parse.ts";

export { migrations } from "./db/migrations.ts";
/** Gleam source without comments/blank lines; a localized starter must equal the Korean one under it. */
export { codeOnly } from "./loader/gleam.ts";
export type { ContentBundle, ContentIssue, LessonTranslationGap };

/**
 * Lesson overlays that are not complete for their locale (why a unit lacks that locale in `LessonUnitSummary.locales`).
 * Incomplete translations are not issues: they are served field by field with Korean fallback.
 */
export function lessonTranslationGaps(bundle: ContentBundle): readonly LessonTranslationGap[] {
  const parsed = parsedContentOf(bundle);
  return parsed ? gapsOf(parsed.lessonUnits) : [];
}

export interface ContentModuleDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly events: EventBus;
  readonly logger: Logger;
}

export interface ContentAdmin {
  /** Parse and validate a content directory without touching the DB. Collects every issue found. */
  loadDirectory(dir: string): Promise<Result<ContentBundle, readonly ContentIssue[]>>;
  /**
   * Import a bundle from `loadDirectory`. Unchanged exercises keep their version; changed ones get version+1;
   * removed ones are retired. Re-importing the current bundle (same contentHash) is a no-op.
   */
  importBundle(bundle: ContentBundle): Promise<Result<BundleInfo, AppError>>;
}

export interface ContentModule {
  readonly catalog: ContentCatalog;
  readonly admin: ContentAdmin;
}

export function createContentModule(deps: ContentModuleDeps): ContentModule {
  return {
    catalog: createCatalog(deps.db),
    admin: {
      loadDirectory,
      importBundle: (bundle) => importBundle(deps, bundle),
    },
  };
}
