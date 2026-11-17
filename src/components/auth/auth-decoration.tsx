// The soft rounded blocks under the sign-in panel's text — a simple,
// purely decorative illustration (one tall pill and two lozenges, echoing
// the shape of the "daily rhythm" mark). It is NOT the logo: the real logo
// is always the supplied SVG file (see components/brand/logo.tsx). Hidden
// from screen readers because it carries no information.
export function AuthDecoration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 490 306"
      className={className}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Tall white pill with three short lines */}
      <rect x="0" y="0" width="141" height="306" rx="70" fill="#FFFFFF" opacity="0.92" />
      <rect x="25" y="82" width="92" height="18" rx="9" fill="#DDD3EF" />
      <rect x="25" y="135" width="92" height="18" rx="9" fill="#DDD3EF" />
      <rect x="25" y="188" width="92" height="18" rx="9" fill="#DDD3EF" />

      {/* Upper lilac lozenge */}
      <rect x="160" y="14" width="330" height="126" rx="63" fill="#A393CB" opacity="0.85" />
      <rect x="212" y="48" width="216" height="20" rx="10" fill="#FFFFFF" opacity="0.5" />
      <rect x="212" y="84" width="153" height="20" rx="10" fill="#FFFFFF" opacity="0.5" />

      {/* Lower, lighter lozenge */}
      <rect x="160" y="167" width="285" height="123" rx="61" fill="#D2C7EA" />
      <rect x="208" y="199" width="180" height="19" rx="9.5" fill="#FFFFFF" opacity="0.6" />
      <rect x="208" y="235" width="121" height="19" rx="9.5" fill="#FFFFFF" opacity="0.6" />
    </svg>
  );
}
