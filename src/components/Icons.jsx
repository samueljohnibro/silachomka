
export const PlayIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5V19L19 12L8 5Z" fill={color} />
  </svg>
);

export const PauseIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z" fill={color} />
  </svg>
);

export const DownCaretIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M7 10L12 15L17 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const LeftArrowIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const RightArrowIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MusicNoteIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15C6.3986 15 6.77914 15.0776 7.12643 15.2173L7.81881 12.4478C8.21443 10.8653 9.77443 9.87062 11.3917 10.1587L18.4988 11.4248C19.897 11.6739 21 12.8798 21 14.3013V17C21 18.6569 19.6569 20 18 20C16.3431 20 15 18.6569 15 17C15 15.3431 16.3431 14 18 14C18.4116 14 18.8037 14.0827 19.1611 14.2307V14.3013C19.1611 13.7327 18.72 13.2503 18.1607 13.1507L11.0536 11.8846C10.0833 11.7117 9.14728 12.3086 8.90993 13.2581L8.12282 16.4065C8.67566 16.7416 9 17.3374 9 18Z" fill={color}/>
  </svg>
);


export const UpRightArrowIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M7 17L17 7M17 7H7M17 7V17" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const LightningIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M13 3L4 14H12L11 21L20 10H12L13 3Z" fill="currentColor" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ShuffleIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M16 3H21V8M4 20L21 3M21 16V21H16M15 15L21 21M4 4L9 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const RepeatIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M17 1L21 5L17 9M3 11V9C3 6.79086 4.79086 5 7 5H21M7 23L3 19L7 15M21 13V15C21 17.2091 19.2091 19 17 19H3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const RepeatOneIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M17 1L21 5L17 9M3 11V9C3 6.79086 4.79086 5 7 5H21M7 23L3 19L7 15M21 13V15C21 17.2091 19.2091 19 17 19H3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="12" y="14" textAnchor="middle" fill={color} fontSize="8" fontWeight="bold">1</text>
  </svg>
);

export const PreviousTrackIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M19 20L9 12L19 4V20Z" fill={color}/>
    <rect x="5" y="4" width="2" height="16" fill={color}/>
  </svg>
);

export const NextTrackIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M5 4L15 12L5 20V4Z" fill={color}/>
    <rect x="17" y="4" width="2" height="16" fill={color}/>
  </svg>
);

export const SkipBackIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M11 19L2 12L11 5V19Z" fill={color}/>
    <path d="M22 19L13 12L22 5V19Z" fill={color}/>
  </svg>
);

export const SkipForwardIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M13 5L22 12L13 19V5Z" fill={color}/>
    <path d="M2 5L11 12L2 19V5Z" fill={color}/>
  </svg>
);

export const CameraIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2"/>
  </svg>
);

export const GridIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="2"/>
    <rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="2"/>
    <rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="2"/>
    <rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="2"/>
  </svg>
);

export const ReelIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <rect x="2" y="2" width="20" height="20" rx="3" stroke={color} strokeWidth="2"/>
    <line x1="2" y1="8" x2="22" y2="8" stroke={color} strokeWidth="2"/>
    <line x1="8" y1="2" x2="8" y2="8" stroke={color} strokeWidth="2"/>
    <line x1="16" y1="2" x2="16" y2="8" stroke={color} strokeWidth="2"/>
    <path d="M10 17V12L15 14.5L10 17Z" fill={color}/>
  </svg>
);

export const TrashIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const RestoreIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M1 4V10H7M23 20V14H17" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.49 9C19.9828 7.56678 19.1209 6.28531 17.9845 5.27542C16.8482 4.26553 15.4745 3.55976 13.9917 3.22426C12.5089 2.88875 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1112 10.0083 20.7757C8.52547 20.4402 7.15184 19.7345 6.01547 18.7246C4.87909 17.7147 4.01719 16.4332 3.51 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const LoadingSpinner = ({ size = 18, color = "currentColor", className = "" }) => (
  <svg
    className={`chomka-svg-spinner ${className}`.trim()}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Loading"
    role="status"
    style={{ display: "inline-flex", verticalAlign: "middle", flexShrink: 0 }}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke={color}
      strokeOpacity="0.24"
      strokeWidth="2.5"
    />
    <path
      d="M21 12C21 7.02944 16.9706 3 12 3"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const CrownIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <path d="M3 18H21M4 15L2 6L8.5 11L12 4L15.5 11L22 6L20 15H4Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShareIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <circle cx="18" cy="5" r="3" stroke={color} strokeWidth="2" />
    <circle cx="6" cy="12" r="3" stroke={color} strokeWidth="2" />
    <circle cx="18" cy="19" r="3" stroke={color} strokeWidth="2" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke={color} strokeWidth="2" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke={color} strokeWidth="2" />
  </svg>
);

export const CheckIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <polyline points="20 6 9 17 4 12" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const VolumeOnIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const VolumeOffIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="23" y1="9" x2="17" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="17" y1="9" x2="23" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FullscreenIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <polyline points="15 3 21 3 21 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="9 21 3 21 3 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="21" y1="3" x2="14" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="21" x2="10" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ExitFullscreenIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-flex", verticalAlign: "middle" }}>
    <polyline points="4 14 10 14 10 20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="20 10 14 10 14 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="14" y1="10" x2="21" y2="3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="21" x2="10" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

