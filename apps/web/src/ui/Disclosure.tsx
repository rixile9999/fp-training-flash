import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon.tsx";
import type { IconName } from "./Icon.tsx";

/** Collapsible section, folded by default. `onFirstOpen` fires once, the first time it is expanded. */
export function Disclosure(props: {
  readonly title: string;
  readonly icon?: IconName;
  readonly meta?: string;
  readonly onFirstOpen?: () => void;
  readonly children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const id = useId();
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !opened) {
      setOpened(true);
      props.onFirstOpen?.();
    }
  };
  return (
    <section className={`disclosure${open ? " is-open" : ""}`}>
      <h3 className="disclosure-heading">
        <button type="button" className="disclosure-toggle" aria-expanded={open} aria-controls={id} onClick={toggle}>
          {props.icon && <Icon name={props.icon} />}
          <span className="disclosure-title">{props.title}</span>
          {props.meta && <span className="disclosure-meta">{props.meta}</span>}
          <span className="disclosure-chevron">
            <Icon name={open ? "chevronDown" : "chevronRight"} />
          </span>
        </button>
      </h3>
      <div id={id} className="disclosure-body" hidden={!open}>
        {open && props.children}
      </div>
    </section>
  );
}
