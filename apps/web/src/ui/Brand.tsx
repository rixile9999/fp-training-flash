export function Brand() {
  return (
    <span className="brand">
      <svg className="brand-mark" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
        <rect width="28" height="28" rx="7" fill="#8f1f73" />
        <path d="M9 7h10M9 7v14M9 14h7" stroke="#ffaff3" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M17 17l3 2.5-3 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="brand-name">
        FP Training <span className="brand-flash">Flash</span>
      </span>
    </span>
  );
}
