export const RadialGradientIcon = ({ size = 20 }: { size?: number }) => (
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
        {/* outer rays */}
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="7.07" y2="7.07" />
        <line x1="16.93" y1="16.93" x2="19.07" y2="19.07" />
        <line x1="4.93" y1="19.07" x2="7.07" y2="16.93" />
        <line x1="16.93" y1="7.07" x2="19.07" y2="4.93" />

        {/* inner circle */}
        <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.3" />
    </svg>
);
