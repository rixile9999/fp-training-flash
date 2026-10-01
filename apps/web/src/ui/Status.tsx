import { useI18n } from "../i18n/I18n.tsx";
import { Icon } from "./Icon.tsx";

/** Pass/fail marker: always icon + text, never colour alone. */
export function StatusBadge({ ok, okLabel, failLabel }: { readonly ok: boolean; readonly okLabel?: string; readonly failLabel?: string }) {
  const { t } = useI18n();
  return (
    <span className={`status ${ok ? "status-pass" : "status-fail"}`}>
      <Icon name={ok ? "checkCircle" : "xCircle"} size={16} />
      {ok ? (okLabel ?? t("common.pass")) : (failLabel ?? t("common.fail"))}
    </span>
  );
}

/** Inline error text announced to screen readers; renders nothing without a message. */
export function Alert({ message }: { readonly message: string | null }) {
  return message ? (
    <p className="inline-error" role="alert">
      {message}
    </p>
  ) : null;
}
