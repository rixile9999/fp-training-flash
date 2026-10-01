import { useState } from "react";
import type { ApiClient, DevLoginResponse } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import { useI18n } from "../i18n/I18n.tsx";
import type { Locale } from "../i18n/locale.ts";
import { Brand } from "../ui/Brand.tsx";
import { Icon } from "../ui/Icon.tsx";
import { LanguageSwitcher } from "../ui/LanguageSwitcher.tsx";

export function Login(props: {
  readonly api: ApiClient;
  readonly onLoggedIn: (res: DevLoginResponse) => void;
  readonly locale: Locale;
  readonly onLocale: (locale: Locale) => void;
  /** Whether to send `locale` with dev-login (the learner chose one in this browser); otherwise the account's stays. */
  readonly sendLocale: boolean;
}) {
  const { api, onLoggedIn } = props;
  const tr = useI18n();
  const { t } = tr;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!name.trim()) {
      setError(t("login.nameRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onLoggedIn(await api.devLogin({ displayName: name.trim(), ...(props.sendLocale ? { locale: props.locale } : {}) }));
    } catch (e) {
      setError(errorMessage(e, tr));
      setBusy(false);
    }
  };
  return (
    <main className="login">
      <section className="login-intro">
        <div className="login-top">
          <Brand />
          <LanguageSwitcher locale={props.locale} onChange={props.onLocale} />
        </div>
        <h1 className="login-headline">
          {t("login.headline1")}
          <br />
          <span className="accent">{t("login.headline2")}</span>
        </h1>
        <ul className="login-points">
          <li>
            <Icon name="clock" /> {t("login.point1")}
          </li>
          <li>
            <Icon name="checkCircle" /> {t("login.point2")}
          </li>
          <li>
            <Icon name="chart" /> {t("login.point3")}
          </li>
        </ul>
        <p className="lang-chip">Gleam · Erlang</p>
      </section>
      <section className="login-card panel" aria-labelledby="login-h">
        <h2 id="login-h" className="card-title">
          {t("login.title")}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          noValidate
        >
          <label htmlFor="display-name" className="field-label">
            {t("login.nameLabel")}
          </label>
          <input
            id="display-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            placeholder={t("login.namePlaceholder")}
            aria-describedby="login-help"
            aria-invalid={error ? true : undefined}
          />
          <p id="login-help" className="muted small">
            {t("login.help")}
          </p>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t("login.submitting") : t("login.submit")} <Icon name="arrowRight" />
          </button>
        </form>
      </section>
    </main>
  );
}
