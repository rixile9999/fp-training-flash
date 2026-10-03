/** Recall tab navigation as plain data (App state, kept across tabs). `draft` is the current answer text. */
import type { RecallAnswerResult, RecallSessionView, RecallSummary } from "@fp/api-contract";
import type { DeckProgress } from "./api/types.ts";

export type RecallRoute =
  | { readonly screen: "overview" }
  | { readonly screen: "deck"; readonly deck: DeckProgress }
  | { readonly screen: "session"; readonly session: RecallSessionView; readonly index: number; readonly intro: boolean; readonly draft: string; readonly result: RecallAnswerResult | null }
  | { readonly screen: "summary"; readonly summary: RecallSummary };

export const RECALL_HOME: RecallRoute = { screen: "overview" };

/** Item `index` of a session, starting with the intro for new cards. */
export const sessionRoute = (session: RecallSessionView, index = 0): RecallRoute => ({ screen: "session", session, index, intro: session.items[index]?.kind === "new", draft: "", result: null });
