import { useEffect, useRef, useState } from "react";
import type { ApiClient, ChatMessage } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import { Icon } from "../ui/Icon.tsx";
import { Markdown } from "../ui/Markdown.tsx";

const QUICK_ACTIONS = ["실패한 테스트를 설명해 주세요", "관련 개념을 다시 설명해 주세요", "제 접근을 검토해 주세요", "무엇부터 확인하면 될까요?"];

export function CoachPanel(props: {
  readonly api: ApiClient;
  readonly exerciseId: string;
  readonly getCode: () => string;
  readonly submissionId?: string | undefined;
}) {
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
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="panel coach-panel" aria-labelledby="coach-h">
      <h2 id="coach-h" className="coach-title">
        <Icon name="message" /> 코치
      </h2>
      <p className="coach-policy">
        <Icon name="eye" size={16} /> 코치는 요청하기 전까지 정답 코드를 보여주지 않습니다
      </p>
      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label="코치 대화">
        {messages.length === 0 && <p className="console-empty">막히는 부분을 물어보세요. 코치는 질문과 근거로 방향을 잡아 줍니다.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            <span className="msg-who">{m.role === "user" ? "나" : "코치"}</span>
            {m.role === "assistant" ? <Markdown source={m.content} /> : <p>{m.content}</p>}
          </div>
        ))}
        {busy && <p className="msg msg-assistant msg-pending">코치가 답변을 작성하고 있습니다...</p>}
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="quick-actions" role="group" aria-label="빠른 질문">
        {QUICK_ACTIONS.map((q) => (
          <button key={q} type="button" className="btn btn-quiet btn-small" onClick={() => void send(q)} disabled={busy}>
            {q}
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
          코치에게 질문
        </label>
        <textarea
          id="coach-input"
          className="input textarea"
          rows={3}
          value={draft}
          placeholder="예: 왜 두 번째 테스트만 실패하나요?"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send(draft);
            }
          }}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !draft.trim()}>
          <Icon name="send" /> 보내기
        </button>
      </form>
    </aside>
  );
}
