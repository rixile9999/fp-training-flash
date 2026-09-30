import { Icon } from "./Icon.tsx";

/** Pass/fail marker: always icon + text, never colour alone. */
export function StatusBadge({ ok, okLabel = "통과", failLabel = "실패" }: { readonly ok: boolean; readonly okLabel?: string; readonly failLabel?: string }) {
  return (
    <span className={`status ${ok ? "status-pass" : "status-fail"}`}>
      <Icon name={ok ? "checkCircle" : "xCircle"} size={16} />
      {ok ? okLabel : failLabel}
    </span>
  );
}
