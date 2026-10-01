import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon.tsx";

/** Page heading that takes focus on mount (screen changes inside a tab are announced and start at the top). */
export function PageTitle({ children, focus = true }: { readonly children: ReactNode; readonly focus?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus]);
  return (
    <h1 ref={ref} tabIndex={-1} className="page-title">
      {children}
    </h1>
  );
}

export function BackLink({ label, onClick }: { readonly label: string; readonly onClick: () => void }) {
  return (
    <button type="button" className="back-link" onClick={onClick}>
      <Icon name="arrowLeft" size={16} /> {label}
    </button>
  );
}
