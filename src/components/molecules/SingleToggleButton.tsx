/**
 * SingleToggleButton
 * @param {string} keyOn - key for active state
 * @param {string} keyOff - key for inactive state
 * @param {string} iconOn - icon class for active
 * @param {string} iconOff - icon class for inactive
 * @param {string} tooltipOn - tooltip when active
 * @param {string} tooltipOff - tooltip when inactive
 * @param {boolean} initial - optional initial state
 * @param {function} onChange - callback({ action, value })
 */

import { useState } from "react";
import { Tooltip } from "./Tooltip";

/**
 * SingleToggleButton
 * Supports both JSX icons (SVG/React) and Font Awesome class strings
 */
export function SingleToggleButton({
  action,
  toggleType = "switch",
  iconOn,
  iconOff,
  tooltipOn = "",
  tooltipOff = "",
  initial = false,
  size = 26,
  onChange,
}) {
  const [active, setActive] = useState(initial);

  const handleClick = () => {
    let next = active;
    if (toggleType === "switch") next = !active;
    if (toggleType === "exclusive") next = true;

    setActive(next);
    onChange?.({ action, value: next });
  };

  const renderIcon = (icon) => {
    if (typeof icon === "string") {
      // Font Awesome class string
      return <i className={icon} style={{ fontSize: size * 0.55 }} />;
    }
    // JSX / React component (SVG)
    return icon;
  };

  return (
    <Tooltip content={active ? tooltipOn : tooltipOff} position="bottom">
      <button
        onClick={handleClick}
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          background: active
            ? "linear-gradient(#3b82f6, #2563eb)"
            : "linear-gradient(#ffffff, #f1f5f9)",
          border: "1px solid #cbd5e1",
          boxShadow: active
            ? "0 2px 4px rgba(37,99,235,0.4)"
            : "0 1px 2px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 140ms ease",
          color: active ? "#fff" : "#334155",
        }}
      >
        <div
          style={{
            width: size * 0.6,
            height: size * 0.6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {renderIcon(active ? iconOn : iconOff)}
        </div>
      </button>
    </Tooltip>
  );
}
