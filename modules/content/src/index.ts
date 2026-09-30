/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { AppError, Clock, Db, EventBus, Logger, Migration, Result } from "@fp/kernel";
import type { BundleInfo, ContentCatalog } from "./contract/index.ts";

export interface ContentModuleDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly events: EventBus;
  readonly logger: Logger;
}

/** A problem found while loading /content. `path` is relative to the content root. */
export interface ContentIssue {
  readonly path: string;
  readonly message: string;
}

/** Fully parsed, validated content tree. Opaque to other modules. */
export interface ContentBundle {
  readonly bundleId: string;
  readonly contentHash: string;
}

export interface ContentAdmin {
  /** Parse and validate a content directory without touching the DB. */
  loadDirectory(dir: string): Promise<Result<ContentBundle, readonly ContentIssue[]>>;
  /** Import a bundle. Unchanged exercises keep their version; changed ones get version+1. Idempotent per contentHash. */
  importBundle(bundle: ContentBundle): Promise<Result<BundleInfo, AppError>>;
}

export interface ContentModule {
  readonly catalog: ContentCatalog;
  readonly admin: ContentAdmin;
}

export const migrations: readonly Migration[] = [];

export function createContentModule(_deps: ContentModuleDeps): ContentModule {
  throw new Error("not implemented");
}
