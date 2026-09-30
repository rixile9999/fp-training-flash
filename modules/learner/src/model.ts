import { createEvent, type Clock, type Db, type DomainEvent, type EventBus, type Logger } from "@fp/kernel";
import type { ExerciseId, Language, SkillId, SubmissionId, UserId } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import type { SubmissionEvaluatedPayload } from "@fp/grading/contract";
import {
  LEARNER_EVENTS,
  type LearnerModel,
  type LearnerProfile,
  type Observation,
  type OverallRating,
  type RatingUpdatedPayload,
  type ReviewItem,
  type SkillEstimate,
} from "./contract/index.ts";
import { observationFromEvaluation } from "./observation.ts";
import { activePolicy, type RatingPolicy } from "./policy/elo-v1.ts";
import {
  applyObservation,
  getRating,
  getRatingChange,
  insertObservation,
  listErrorTags,
  listObservationLog,
  listRatings,
  listReviews,
  observationExists,
  truncateDerived,
  type RatingRow,
} from "./store.ts";

export interface LearnerModelDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly events: EventBus;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
  /** Defaults to the active policy ("elo-v1"). */
  readonly policy?: RatingPolicy;
}

export interface LearnerModelImpl extends LearnerModel {
  /** Handler for `grading.submission_evaluated`. */
  handleSubmissionEvaluated(event: DomainEvent<string, SubmissionEvaluatedPayload>): Promise<void>;
}

export function createLearnerModel(deps: LearnerModelDeps): LearnerModelImpl {
  const { db, clock, events, logger, catalog } = deps;
  const policy = deps.policy ?? activePolicy;

  const probedTagsFor = async (exerciseId: ExerciseId): Promise<string[]> => {
    const spec = await catalog.getGradingSpec(exerciseId);
    if (!spec) return [];
    const tags = spec.tests.flatMap((t) => (t.errorTag ? [t.errorTag] : []));
    return [...new Set(tags)].sort();
  };

  const estimateFrom = (skillId: SkillId, language: Language, row: RatingRow | undefined): SkillEstimate => {
    const n = row?.ratedObservations ?? 0;
    return {
      skillId,
      language,
      rating: row?.rating ?? policy.initialRating,
      deviation: policy.deviation(n),
      ratedObservations: n,
      provisional: policy.isProvisional(n),
      ...(row?.lastIndependentSuccessAt ? { lastIndependentSuccessAt: row.lastIndependentSuccessAt } : {}),
      updatedAt: row?.updatedAt ?? clock.now().toISOString(),
    };
  };

  const overallFrom = (rows: readonly RatingRow[]): OverallRating | null => {
    const rated = rows.filter((r) => r.ratedObservations > 0);
    const total = rated.reduce((sum, r) => sum + r.ratedObservations, 0);
    if (total === 0) return null;
    const weighted = rated.reduce((sum, r) => sum + r.rating * r.ratedObservations, 0);
    return { rating: weighted / total, provisional: policy.isProvisional(total), method: "observation_weighted_mean" };
  };

  const model: LearnerModelImpl = {
    async recordObservation(obs: Observation): Promise<void> {
      if (await observationExists(db, obs.submissionId)) return;
      const entry = { observation: obs, probedTags: await probedTagsFor(obs.exerciseId) };
      const result = await db.transaction(async (tx) => {
        const inserted = await insertObservation(tx, entry, clock.now().toISOString());
        if (!inserted) return null;
        return { change: await applyObservation(tx, entry, policy) };
      });
      if (!result?.change) return;
      const payload: RatingUpdatedPayload = { userId: obs.userId, submissionId: obs.submissionId, change: result.change };
      await events.publish(createEvent(LEARNER_EVENTS.ratingUpdated, payload, clock));
    },

    async handleSubmissionEvaluated(event) {
      const payload = event.payload;
      if (payload.outcome === "system_error") return;
      const exercise = await catalog.getExercise(payload.exerciseId);
      if (!exercise) {
        logger.warn("learner: evaluated submission for unknown exercise ignored", {
          submissionId: payload.submissionId,
          exerciseId: payload.exerciseId,
        });
        return;
      }
      const skill = await catalog.getSkill(exercise.primarySkill);
      if (!skill) {
        logger.warn("learner: unknown skill, treating as core track", { skillId: exercise.primarySkill });
      }
      const obs = observationFromEvaluation(payload, exercise, skill?.track ?? "core");
      if (obs) await model.recordObservation(obs);
    },

    async getProfile(userId: UserId, language: Language): Promise<LearnerProfile> {
      const [skills, rows, reviews, errorTags] = await Promise.all([
        catalog.listSkills(),
        listRatings(db, userId, language),
        listReviews(db, userId, language),
        listErrorTags(db, userId),
      ]);
      const byId = new Map(rows.map((r) => [r.skillId as string, r]));
      const ordered = [...skills].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      const known = new Set(ordered.map((s) => s.id as string));
      const estimates = [
        ...ordered.map((s) => estimateFrom(s.id, language, byId.get(s.id))),
        // Observed skills no longer in the catalog stay visible rather than silently disappearing.
        ...rows.filter((r) => !known.has(r.skillId)).map((r) => estimateFrom(r.skillId, language, r)),
      ];
      return {
        userId,
        language,
        estimates,
        overall: overallFrom(rows),
        reviews,
        errorTags,
        policyVersion: policy.version,
      };
    },

    async expectedSuccess(userId, skillId, language, difficulty) {
      const row = await getRating(db, userId, skillId, language);
      return policy.expectedSuccess(row?.rating ?? policy.initialRating, difficulty);
    },

    async dueReviews(userId: UserId, language: Language, at: Date): Promise<readonly ReviewItem[]> {
      return listReviews(db, userId, language, at.toISOString());
    },

    ratingChangeFor(submissionId: SubmissionId) {
      return getRatingChange(db, submissionId);
    },

    replayAll() {
      return db.transaction(async (tx) => {
        await truncateDerived(tx);
        const log = await listObservationLog(tx);
        for (const entry of log) await applyObservation(tx, entry, policy);
        logger.info("learner: replayed observation log", { observations: log.length, policyVersion: policy.version });
        return { observations: log.length, policyVersion: policy.version };
      });
    },
  };
  return model;
}
