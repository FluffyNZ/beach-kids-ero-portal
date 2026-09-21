type IconProps = { className?: string };

const base = "h-5 w-5";

export function DashboardIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function ChecklistIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 8h8M8 12.5l1.5 1.5L12.5 11M8 17h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LibraryIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function ActionsIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 4v16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5 5h11l-2.5 3L16 11H5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function PackIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function PolicyIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-2.9 7.9-7 9-4.1-1.1-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StaffIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="17" cy="8.5" r="2.3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14.8 20c-.2-2.6 1.1-5.3 3.4-5.3s3.9 2.4 3.9 5.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChildrenIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9.5" cy="6.5" r="2.8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 19c0-3 2.5-5.3 5.5-5.3S15 16 15 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="17.5" cy="16.5" r="3.7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M17.5 14.6v3.8M16.3 15.6h2.1a.75.75 0 0 1 0 1.5h-1.8a.75.75 0 0 0 0 1.5h2.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RosterIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 9.5h18M8 3v3M16 3v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 13.5h3M7 17h3M14 13.5h3M14 17h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.6a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.4a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 6.05 9.5a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5a1.7 1.7 0 0 0 1.04-1.56V3.4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9.5a1.7 1.7 0 0 0 1.56 1.04h.09a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function LogoutIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UploadIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 16V4M7 9l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LinkIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 15l6-6M10 5.5l1-1a3.5 3.5 0 0 1 5 5l-1 1M14 18.5l-1 1a3.5 3.5 0 0 1-5-5l1-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DownloadIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 4v12M7 11l5 5 5-5M4 19h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EyeIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function TrashIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function AlertIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 9v4M12 16.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function FlagIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 3v18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5 4h11l-2.5 3.5L16 11H5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function StockIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M3.5 7.5 12 12m0 0 8.5-4.5M12 12v9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function FinancesIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7v10M9.5 9.2c0-1.2 1.1-2.2 2.5-2.2s2.5.9 2.5 2c0 3-5 1.7-5 4.6 0 1.1 1.1 2.1 2.5 2.1s2.5-.9 2.5-2.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3l7 3v5.5c0 4.9-3 8.6-7 9.5-4-.9-7-4.6-7-9.5V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BookOpenIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 6.5c-1.5-1.3-3.6-2-6.5-2A1.5 1.5 0 0 0 4 6v11.5c0 .55.45 1 1 1 .12 0 .23-.02.35-.06C7.1 17.9 9.4 18 12 19.5c2.6-1.5 4.9-1.6 6.65-1.06.12.04.23.06.35.06.55 0 1-.45 1-1V6a1.5 1.5 0 0 0-1.5-1.5c-2.9 0-5 .7-6.5 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 6.5v13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function WaveIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M2 15c1.5 1.5 3.5 1.5 5 0s3.5-1.5 5 0 3.5 1.5 5 0 3.5-1.5 5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M2 9c1.5 1.5 3.5 1.5 5 0s3.5-1.5 5 0 3.5 1.5 5 0 3.5-1.5 5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function CalendarIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 9.5h18M8 3v3M16 3v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="8" cy="13.5" r="1.1" fill="currentColor" />
      <circle cx="12" cy="13.5" r="1.1" fill="currentColor" />
      <circle cx="16" cy="13.5" r="1.1" fill="currentColor" />
      <circle cx="8" cy="17" r="1.1" fill="currentColor" />
      <circle cx="12" cy="17" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function MoreIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
