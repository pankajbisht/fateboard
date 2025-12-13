import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const GAP = 8;
const DELAY = 300;

export const Tooltip = ({ content, position = "top", children }) => {
  if (!content) return <>{children}</>;

  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timerRef = useRef(null);

  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [finalPos, setFinalPos] = useState(position);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), DELAY);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;

    const t = triggerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();

    const calc = (pos) => {
      switch (pos) {
        case "bottom":
          return {
            top: t.bottom + GAP,
            left: t.left + t.width / 2 - tip.width / 2,
          };
        case "left":
          return {
            top: t.top + t.height / 2 - tip.height / 2,
            left: t.left - tip.width - GAP,
          };
        case "right":
          return {
            top: t.top + t.height / 2 - tip.height / 2,
            left: t.right + GAP,
          };
        default:
          return {
            top: t.top - tip.height - GAP,
            left: t.left + t.width / 2 - tip.width / 2,
          };
      }
    };

    let pos = position;
    let { top, left } = calc(pos);

    // 🔄 Auto flip if out of viewport
    if (top < 4 && pos === "top") pos = "bottom";
    if (top + tip.height > window.innerHeight && pos === "bottom") pos = "top";
    if (left < 4 && pos === "left") pos = "right";
    if (left + tip.width > window.innerWidth && pos === "right") pos = "left";

    ({ top, left } = calc(pos));

    setFinalPos(pos);
    setCoords({
      top: Math.max(6, top),
      left: Math.max(6, left),
    });
  }, [visible, position]);

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
      >
        {children}
      </span>

      {visible &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
            }}
            className="
              z-[9999]
              rounded-md
              bg-white
              px-3 py-1.5
              text-[11px]
              font-medium
              text-gray-900
              shadow-[0_8px_24px_rgba(0,0,0,0.18)]
              whitespace-nowrap
              pointer-events-none
              animate-tooltip-min
            "
          >
            {content}

            {/* Subtle caret */}
            <div
              className={`
                absolute w-1.5 h-1.5 bg-white rotate-45
                ${
                  finalPos === "top"
                    ? "bottom-[-3px] left-1/2 -translate-x-1/2"
                    : finalPos === "bottom"
                    ? "top-[-3px] left-1/2 -translate-x-1/2"
                    : finalPos === "left"
                    ? "right-[-3px] top-1/2 -translate-y-1/2"
                    : "left-[-3px] top-1/2 -translate-y-1/2"
                }
              `}
            />
          </div>,
          document.body
        )}
    </>
  );
};
