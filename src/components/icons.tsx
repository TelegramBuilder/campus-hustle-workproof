import type { ReactNode } from 'react';

interface P {
  size?: number;
  className?: string;
  fill?: boolean;
  style?: React.CSSProperties;
}

function Svg({ size = 20, className, children, viewBox = '0 0 24 24', style }: P & { children: ReactNode; viewBox?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
  </Svg>
);

export const IconExplore = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
    <path d="M11 8.5 13 11l-2.5 2.5L8 11z" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconChat = (p: P) => (
  <Svg {...p}>
    <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3c-1.4 0-2.7-.3-3.9-.8L3 21l2-5.2a8.1 8.1 0 0 1-1-4.3A8.4 8.4 0 0 1 12.5 3.2 8.4 8.4 0 0 1 21 11.5z" />
  </Svg>
);

export const IconUser = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Svg>
);

export const IconBell = (p: P) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </Svg>
);

export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="m15 5-7 7 7 7" />
  </Svg>
);

export const IconStar = (p: P & { filled?: boolean }) => (
  <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" aria-hidden>
    <path
      d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"
      fill={p.filled === false ? '#d7dee8' : 'currentColor'}
      stroke={p.filled === false ? '#d7dee8' : 'currentColor'}
      strokeWidth={1}
    />
  </svg>
);

export const IconShield = (p: P) => (
  <Svg {...p}>
    <path d="M12 2.8 20 6v6c0 5-3.4 8.4-8 9.6C7.4 20.4 4 17 4 12V6z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);

export const IconChevron = (p: P) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

export const IconFilter = (p: P) => (
  <Svg {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Svg>
);

export const IconHeart = (p: P & { filled?: boolean }) => (
  <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" aria-hidden>
    <path
      d="M12 20.5S3.5 15 3.5 8.8A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.5 2.8C20.5 15 12 20.5 12 20.5z"
      fill={p.filled ? '#DC2626' : 'none'}
      stroke="#DC2626"
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </svg>
);

export const IconFlag = (p: P) => (
  <Svg {...p}>
    <path d="M5 21V4" />
    <path d="M5 4c4-2.5 7 2 11 0v9c-4 2-7-2.5-11 0" />
  </Svg>
);

export const IconSend = (p: P) => (
  <Svg {...p}>
    <path d="m21 3-9.5 9.5" />
    <path d="M21 3 14 21l-2.5-8.5L3 10z" />
  </Svg>
);

export const IconPaperclip = (p: P) => (
  <Svg {...p}>
    <path d="m20 11.5-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8L13 3.5a3.5 3.5 0 0 1 5 5L8.8 17.7a1.5 1.5 0 0 1-2.1-2.1l7.5-7.5" />
  </Svg>
);

export const IconCalendar = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
);

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s7-6 7-11.5A7 7 0 0 0 5 9.5C5 15 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);

export const IconZap = (p: P) => (
  <Svg {...p}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
  </Svg>
);

export const IconCrown = (p: P) => (
  <Svg {...p}>
    <path d="M3 17 5.5 7l5 5L12 8l1.5 4 5-5L21 17z" />
    <path d="M3 21h18" />
  </Svg>
);

export const IconHelp = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.2a2.5 2.5 0 0 1 4.9.8c0 1.8-2.5 2-2.5 3.5" />
    <path d="M12 17h.01" />
  </Svg>
);

export const IconLogout = (p: P) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </Svg>
);

export const IconX = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </Svg>
);

export const IconWallet = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="14" rx="2.5" />
    <path d="M3 10h18M16 15h2" />
  </Svg>
);

export const IconSettings = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z" />
  </Svg>
);

export const IconPhone = (p: P) => (
  <Svg {...p}>
    <path d="M5 4h4l1.5 4.5-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2L20 15v4a1.5 1.5 0 0 1-1.7 1.5C10 19.7 4.3 14 3.5 5.7A1.5 1.5 0 0 1 5 4z" />
  </Svg>
);

export const IconVerified = (p: P) => (
  <svg width={p.size ?? 15} height={p.size ?? 15} viewBox="0 0 24 24" aria-hidden>
    <path
      d="M12 1.8l2.6 1.9 3.2-.4 1 3.1 2.8 1.7-.9 3.1.9 3.1-2.8 1.7-1 3.1-3.2-.4-2.6 1.9-2.6-1.9-3.2.4-1-3.1L2.4 13l.9-3.1-.9-3.1 2.8-1.7 1-3.1 3.2.4z"
      fill="#087F5B"
      stroke="#065f46"
      strokeWidth={1}
      strokeLinejoin="round"
    />
    <path d="m8.6 12.2 2.2 2.2 4.6-4.9" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export const IconDashboard = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Svg>
);

export const IconMegaphone = (p: P) => (
  <Svg {...p}>
    <path d="M3 11v2a1.5 1.5 0 0 0 1.5 1.5H6l9 4.5V5.5L6 10H4.5A1.5 1.5 0 0 0 3 11.5z" />
    <path d="M15 9a4 4 0 0 1 0 6" />
  </Svg>
);

export const IconBox = (p: P) => (
  <Svg {...p}>
    <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" />
    <path d="M4 7.5 12 12m0 0 8-4.5M12 12v9" />
  </Svg>
);

export const IconTag = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 12.5 12 4l8.5.5.5 8.5-8.5 8.5z" />
    <circle cx="8.5" cy="8.5" r="1.5" />
  </Svg>
);

export const IconPassport = (p: P) => (
  <Svg {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5z" />
    <path d="M8 8h8M8 12h5M8 16h3" />
    <circle cx="17" cy="16" r="1" />
  </Svg>
);

export const IconTarget = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconAward = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="9" r="6" />
    <path d="M8.5 14 7 21l5-2.5L17 21l-1.5-7" />
    <path d="M9.5 7.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" />
  </Svg>
);

export const IconUsers = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 5a3.5 3.5 0 0 1 0 6.8M17.5 14.2A6.5 6.5 0 0 1 21.5 20" />
  </Svg>
);

export const IconFileCheck = (p: P) => (
  <Svg {...p}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
    <path d="m9 14.5 2 2 4-4" />
  </Svg>
);

export const IconLayers = (p: P) => (
  <Svg {...p}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5" />
  </Svg>
);

export const IconLink = (p: P) => (
  <Svg {...p}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4.4l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.6 1.6" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4-.4l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.6-1.6" />
  </Svg>
);

export const IconEdit = (p: P) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
);

export const IconMore = (p: P) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconSpark = (p: P) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" aria-hidden>
    <path
      d="M12 2l1.8 5.6L19 9.6l-5.2 2 1.8 5.6L12 14.6 8.4 17.2l1.8-5.6L5 9.6l5.2-2z"
      fill="currentColor"
    />
  </svg>
);