import React from "react";

export function CloseButton({ onClick, size = 24, className = "", title = "Close" }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center rounded-full hover:bg-gray-200 cursor-pointer ${className}`}
      style={{ width: size, height: size }}
    >
      ✕
    </button>
  );
}
