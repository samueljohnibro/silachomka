
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
