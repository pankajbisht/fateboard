import clsx from "clsx";
import { useRef, useState, useLayoutEffect } from "react";

export function Toolbar({ tools, activeTool, onToolClick, position }) {
  const positionClasses = {
    left: "fixed top-1/2 left-0 -translate-y-1/2 flex-col",
    right: "fixed top-1/2 right-0 -translate-y-1/2 flex-col",
    top: "fixed top-0 left-1/2 -translate-x-1/2 flex-row",
    bottom: "fixed bottom-0 left-1/2 -translate-x-1/2 flex-row",
  };

  return (
    <div className={`flex justify-center items-center bg-white shadow rounded-md gap-2 z-50 p-2 ${positionClasses[position]}`}>
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={(e) => onToolClick(tool.id, e)}
          className={`flex justify-center items-center cursor-pointer h-8 w-8 p-2 rounded-md ${activeTool === tool.id ? "bg-blue-500 text-white hover:bg-blue-600" : "hover:bg-stone-200"}`}
        >
          <i className={tool.icon}></i>
        </button>
      ))}
    </div>
  );
}