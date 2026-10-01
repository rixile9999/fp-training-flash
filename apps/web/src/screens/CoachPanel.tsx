import { useEffect, useRef, useState } from "react";
import type { ApiClient, ChatMessage } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import { useI18n } from "../i18n/I18n.tsx";
import type { MessageId } from "../i18n/messages.ts";
import { Icon } from "../ui/Icon.tsx";
import { Markdown } from "../ui/Markdown.tsx";

const QUICK_ACTIONS: readonly MessageId[] = ["coach.quick.failedTest", "coach.quick.concept", "coach.quick.review", "coach.quick.first"];

export function CoachPanel(props: {
  readonly api: ApiClient;
  readonly exerciseId: string;
  readonly getCode: () => string;
  readonly submissionId?: string | undefined;
}) {
  const tr = useI18n();
  const { t } = tr;
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el && typeof el.scrollTo === "function") el.scrollTo({ top: el.scrollHeight });
  }, [messages, busy]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const reply = await props.api.chat({
        exerciseId: props.exerciseId,
        code: props.getCode(),
        ...(props.submissionId ? { submissionId: props.submissionId } : {}),
        messages: next,
      });
      setMessages([...next, reply.message]);
    } catch (e) {
      setError(errorMessage(e, tr));
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="panel coach-panel" aria-labelledby="coach-h">
      <h2 id="coach-h" className="coach-title">
        <Icon name="message" /> {t("coach.title")}
      </h2>
      <p className="coach-policy">
        <Icon name="eye" size={16} /> {t("coach.policy")}
      </p>
      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label={t("coach.log")}>
        {messages.length === 0 && <p className="console-empty">{t("coach.empty")}</p>}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            <span className="msg-who">{m.role === "user" ? t("coach.me") : t("coach.title")}</span>
            {m.role === "assistant" ? <Markdown source={m.content} /> : <p>{m.content}</p>}
          </div>
        ))}
        {busy && <p className="msg msg-assistant msg-pending">{t("coach.pending")}</p>}
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="quick-actions" role="group" aria-label={t("coach.quickGroup")}>
        {QUICK_ACTIONS.map((id) => (
          <button key={id} type="button" className="btn btn-quiet btn-small" onClick={() => void send(t(id))} disabled={busy}>
            {t(id)}
          </button>
        ))}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <label htmlFor="coach-input" className="field-label">
          {t("coach.inputLabel")}
        </label>
        <textarea
          id="coach-input"
          className="input textarea"
          rows={3}
          value={draft}
          placeholder={t("coach.placeholder")}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send(draft);
            }
          }}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !draft.trim()}>
          <Icon name="send" /> {t("coach.send")}
        </button>
      </form>
    </aside>
  );
}
