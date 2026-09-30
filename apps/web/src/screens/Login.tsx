import { useState } from "react";
import type { ApiClient, DevLoginResponse } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import { Brand } from "../ui/Brand.tsx";
import { Icon } from "../ui/Icon.tsx";

export function Login({ api, onLoggedIn }: { readonly api: ApiClient; readonly onLoggedIn: (res: DevLoginResponse) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!name.trim()) {
      setError("표시 이름을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onLoggedIn(await api.devLogin({ displayName: name.trim() }));
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };
  return (
    <main className="login">
      <section className="login-intro">
        <Brand />
        <h1 className="login-headline">
          짧게 풀고, 근거로 배우고,
          <br />
          <span className="accent">새 문제로 확인합니다.</span>
        </h1>
        <ul className="login-points">
          <li>
            <Icon name="clock" /> 15분 세션: 복습, 집중 훈련, 피드백·재제출, 변형 적용
          </li>
          <li>
            <Icon name="checkCircle" /> 실행 결과가 먼저, 코치 피드백은 그다음
          </li>
          <li>
            <Icon name="chart" /> 기술별 레이팅과 복습 일정을 자동으로 관리
          </li>
        </ul>
        <p className="lang-chip">Gleam · Erlang</p>
      </section>
      <section className="login-card panel" aria-labelledby="login-h">
        <h2 id="login-h" className="card-title">
          로그인
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          noValidate
        >
          <label htmlFor="display-name" className="field-label">
            표시 이름
          </label>
          <input
            id="display-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            placeholder="예: 김하늘"
            aria-describedby="login-help"
            aria-invalid={error ? true : undefined}
          />
          <p id="login-help" className="muted small">
            개발용 로그인입니다. 같은 이름으로 다시 들어오면 기록이 이어집니다.
          </p>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "로그인 중..." : "훈련 시작하기"} <Icon name="arrowRight" />
          </button>
        </form>
      </section>
    </main>
  );
}
