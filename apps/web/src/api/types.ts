/**
 * Types derived from the API contract. The web app may depend only on @fp/api-contract, so nested
 * module types (Evaluation, SessionItem, ...) are reached through the DTOs instead of module contracts.
 */
import type { CheckpointResult, CourseView, LearnerProfile, LessonView, PlacementResult, Quiz, RecallAnswerResult, RecallOverview, RecallSessionView, Session, Submission } from "@fp/api-contract";

export type Evaluation = NonNullable<Submission["evaluation"]>;
export type EvaluationOutcome = Evaluation["outcome"];
export type TestResult = Evaluation["tests"][number];
export type RequirementResult = Evaluation["requirements"][number];
export type RubricCheckResult = Evaluation["rubricChecks"][number];
export type Diagnostic = Evaluation["compileDiagnostics"][number];
export type HelpUsed = Submission["helpUsed"];

export type SessionItem = Session["items"][number];
export type SessionItemKind = SessionItem["kind"];

export type SkillEstimate = LearnerProfile["estimates"][number];
export type ReviewItem = LearnerProfile["reviews"][number];
export type ErrorTagStat = LearnerProfile["errorTags"][number];

export type CourseUnit = CourseView["units"][number];
export type NextStep = CourseView["next"];
export type LessonBlock = LessonView["lesson"]["blocks"][number];
export type LessonExercise = Extract<LessonBlock, { kind: "exercise" }>;
export type QuizItem = Quiz["items"][number];
export type QuizItemReview = CheckpointResult["review"][number];
export type PlacementBand = PlacementResult["band"];
export type RecallItem = RecallSessionView["items"][number];
export type RecallStage = RecallAnswerResult["stage"];
export type DeckProgress = RecallOverview["decks"][number];
