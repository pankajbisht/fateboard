const FlipIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M10 5L3.5 19H10V5Z" className="fill-current opacity-50" />
        <path d="M14 5L20.5 19H14V5Z" className="fill-current" />
        <line
            x1="12"
            y1="3"
            x2="12"
            y2="21"
            stroke-width="2"
            stroke-dasharray="3 2"
            stroke-linecap="round"
            className="stroke-current"
        />
    </svg>
);
export default FlipIcon;
