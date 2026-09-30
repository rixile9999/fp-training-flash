import { useState } from "react";
import type { ApiClient, ExerciseView, Hint, Skill } from "@fp/api-contract";
import type { SessionItem } from "../api/types.ts";
import { errorMessage } from "../api/client.ts";
import { CodeBlock } from "../ui/CodeBlock.tsx";
import { Disclosure } from "../ui/Disclosure.tsx";
import { Icon } from "../ui/Icon.tsx";
import { Markdown } from "../ui/Markdown.tsx";
import { KIND_LABEL, percent, skillName } from "../ui/labels.ts";

const HINT_KIND: Record<Hint["kind"], string> = {
  question: "질문",
  concept: "개념",
  approach: "접근",
  partial_code: "부분 코드",
  explanation: "해설",
};

export function ProblemPanel(props: {
  readonly api: ApiClient;
  readonly view: ExerciseView;
  readonly item?: SessionItem | undefined;
  readonly skills: readonly Skill[];
}) {
  const { api, view, item, skills } = props;
  const ex = view.exercise;
  const noteOpened = (kind: "concept" | "theory", ids: readonly string[]) => {
    for (const noteId of ids) void api.noteOpened(ex.id, { kind, noteId }).catch(() => undefined);
  };
  return (
    <div className="panel problem-panel">
      <ul className="chips" aria-label="문제 정보">
        <li className="chip chip-accent">{KIND_LABEL[ex.kind]}</li>
        <li className="chip">{skillName(skills, ex.primarySkill)}</li>
        <li className="chip">
          난이도 <span className="mono">{ex.difficulty}</span>
        </li>
        {item && (
          <li className="chip">
            예상 성공률 <span className="mono">{percent(item.expectedSuccess)}</span>
          </li>
        )}
      </ul>
      <h1 className="problem-title">{ex.title}</h1>
      <Markdown source={ex.promptMarkdown} className="prompt" />
      {ex.predict && <CodeBlock code={ex.predict.code} label="예측할 코드" />}

      {ex.publicTests.length > 0 && (
        <section className="public-tests" aria-labelledby="public-tests-h">
          <h2 id="public-tests-h" className="section-label">
            공개 테스트 <span className="count">{ex.publicTests.length}</span>
          </h2>
          {ex.publicTests.map((t) => (
            <div key={t.id} className="public-test">
              <p className="public-test-name">{t.name}</p>
              <CodeBlock code={t.code} label={`테스트 코드: ${t.name}`} />
            </div>
          ))}
        </section>
      )}

      {view.conceptNotes.length > 0 && (
        <Disclosure
          title="코딩 개념 노트"
          icon="code"
          meta={`${view.conceptNotes.length}개`}
          onFirstOpen={() => noteOpened("concept", view.conceptNotes.map((n) => n.id))}
        >
          {view.conceptNotes.map((n) => (
            <article key={n.id} className="note">
              <h4>{n.title}</h4>
              <Markdown source={n.markdown} />
            </article>
          ))}
        </Disclosure>
      )}
      {view.theoryTopics.length > 0 && (
        <Disclosure
          title="이론 노트"
          icon="book"
          meta={`${view.theoryTopics.length}개`}
          onFirstOpen={() => noteOpened("theory", view.theoryTopics.map((n) => n.id))}
        >
          {view.theoryTopics.map((n) => (
            <article key={n.id} className="note">
              <h4>
                {n.title} <span className="chip chip-small">{n.level === "basic" ? "기초" : "심화"}</span>
              </h4>
              <Markdown source={n.markdown} />
              {n.furtherReading.length > 0 && (
                <p className="further">
                  더 읽을거리: {n.furtherReading.map((c) => c.text + (c.verified ? "" : " (서지 확인 전)")).join(" · ")}
                </p>
              )}
            </article>
          ))}
        </Disclosure>
      )}

      {ex.hints.length > 0 && <HintPanel key={ex.id} api={api} exerciseId={ex.id} total={ex.hints.length} initial={view.revealedHints} />}
    </div>
  );
}

export function HintPanel(props: { readonly api: ApiClient; readonly exerciseId: string; readonly total: number; readonly initial: readonly Hint[] }) {
  const [hints, setHints] = useState<readonly Hint[]>(() => [...props.initial].sort((a, b) => a.level - b.level));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const used = hints.length;
  const next = used + 1;
  const reveal = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await props.api.revealHint(props.exerciseId, { level: next });
      setHints([...res].sort((a, b) => a.level - b.level));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="hints" aria-labelledby="hints-h">
      <div className="hints-head">
        <h2 id="hints-h" className="section-label">
          <Icon name="bulb" /> 힌트
        </h2>
        <span className="hint-dots" role="img" aria-label={`힌트 ${props.total}단계 중 ${used}단계 사용`}>
          {[1, 2, 3, 4, 5].map((l) => (
            <span key={l} className={`hint-dot${l <= used ? " is-used" : ""}${l > props.total ? " is-absent" : ""}`} />
          ))}
        </span>
      </div>
      <p className="hint-note">힌트 사용은 감점하지 않고 기록만 합니다</p>
      {hints.length > 0 && (
        <ol className="hint-list" aria-label="공개한 힌트">
          {hints.map((h) => (
            <li key={h.level} className="hint">
              <p className="hint-level">
                {h.level}단계 · {HINT_KIND[h.kind]}
              </p>
              <Markdown source={h.markdown} />
            </li>
          ))}
        </ol>
      )}
      {next <= props.total ? (
        <>
          {next === 3 && <p className="hint-warn">3단계부터는 이 문제의 첫 제출이 레이팅 계산에서 빠집니다.</p>}
          <button type="button" className="btn btn-secondary btn-block" onClick={reveal} disabled={busy}>
            <Icon name="bulb" /> 힌트 {next}단계 보기
          </button>
        </>
      ) : (
        <p className="muted small">모든 힌트를 확인했습니다.</p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
