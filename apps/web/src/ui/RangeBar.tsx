/** Rating ± deviation on a fixed 1000..1800 axis: one-hue band plus a dot. */
export const AXIS_MIN = 1000;
export const AXIS_MAX = 1800;
export const AXIS_TICKS = [1000, 1200, 1400, 1600, 1800] as const;

export const axisPos = (v: number) => ((Math.min(AXIS_MAX, Math.max(AXIS_MIN, v)) - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * 100;

export function rangeLabel(skill: string, rating: number, deviation: number, provisional = false): string {
  const r = Math.round(rating);
  const d = Math.round(deviation);
  return `${skill}: 레이팅 ${r}, 추정 범위 ${r - d}부터 ${r + d}까지${provisional ? " (잠정)" : ""}`;
}

export function RangeBar(props: { readonly skill: string; readonly rating: number; readonly deviation: number; readonly provisional?: boolean }) {
  const { rating, deviation } = props;
  const lo = axisPos(rating - deviation);
  const hi = axisPos(rating + deviation);
  return (
    <div className="range-bar" role="img" aria-label={rangeLabel(props.skill, rating, deviation, props.provisional)}>
      <span className="range-track" />
      {AXIS_TICKS.slice(1, -1).map((t) => (
        <span key={t} className="range-tick" style={{ left: `${axisPos(t)}%` }} />
      ))}
      <span className="range-band" style={{ left: `${lo}%`, width: `${Math.max(0.5, hi - lo)}%` }} />
      <span className="range-dot" style={{ left: `${axisPos(rating)}%` }} />
    </div>
  );
}

export function RangeAxis() {
  return (
    <span className="range-axis" aria-hidden="true">
      {AXIS_TICKS.map((t) => (
        <span key={t} style={{ left: `${axisPos(t)}%` }}>
          {t}
        </span>
      ))}
    </span>
  );
}
