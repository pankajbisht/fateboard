export const LinearGradientIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
        <stop offset="100%" stopColor="currentColor" />
      </linearGradient>
    </defs>

    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
      fill="url(#g1)"
    />
  </svg>
);


export const GradientToolIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="19" x2="19" y2="5" />
    <circle cx="5" cy="19" r="2" fill="currentColor" />
    <circle cx="19" cy="5" r="2" fill="currentColor" />
  </svg>
);
