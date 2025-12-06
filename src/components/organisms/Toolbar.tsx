//import clsx from "clsx";
//import { useRef, useState, useLayoutEffect } from "react";
//
//export function Toolbar({ tools, activeTool, onToolClick, position }) {
//  const positionClasses = {
//    left: "fixed top-1/2 left-0 -translate-y-1/2 flex-col",
//    right: "fixed top-1/2 right-0 -translate-y-1/2 flex-col",
//    top: "fixed top-0 left-1/2 -translate-x-1/2 flex-row",
//    bottom: "fixed bottom-0 left-1/2 -translate-x-1/2 flex-row",
//  };
//
//  return (
//    <div className={`flex justify-center items-center bg-white shadow rounded-md gap-2 z-50 p-2 ${positionClasses[position]}`}>
//      {tools.map((tool) => (
//        <button
//          key={tool.id}
//          onClick={(e) => onToolClick(tool.id, e)}
//          className={`flex justify-center items-center cursor-pointer h-8 w-8 p-2 rounded-md ${activeTool === tool.id ? "bg-blue-500 text-white hover:bg-blue-600" : "hover:bg-stone-200"}`}
//        >
//          <i className={tool.icon}></i>
//        </button>
//      ))}
//    </div>
//  );
//}

import clsx from "clsx";
import { useEffect, useState } from "react";
import { useStore } from "../../store";

export function Toolbar({ tools, activeTool, onToolClick, position }) {
  const isLocked = useStore((state) => state.isActiveObjectLocked());

  const positionClasses = {
    left: "fixed top-1/2 left-0 -translate-y-1/2 flex-col",
    right: "fixed top-1/2 right-0 -translate-y-1/2 flex-col",
    top: "fixed top-0 left-1/2 -translate-x-1/2 flex-row",
    bottom: "fixed bottom-0 left-1/2 -translate-x-1/2 flex-row",
  };

  return (
    <div
      className={`flex justify-center items-center bg-white shadow rounded-md gap-2 z-50 p-2 ${positionClasses[position]}`}
    >
      {tools.map((tool) => {
        // 🔑 if it's the lock tool, override the icon dynamically
        const iconClass =
          tool.id === "lock"
            ? isLocked
              ? "fa-solid fa-lock"
              : "fa-solid fa-unlock"
            : tool.icon;

        return (
          <button
            key={tool.id}
            onClick={(e) => onToolClick(tool.id, e)}
            className={clsx(
              "flex justify-center items-center cursor-pointer h-8 w-8 p-2 rounded-md",
              activeTool === tool.id
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "hover:bg-stone-200"
            )}
          >
            <i className={iconClass}></i>
          </button>
        );
      })}
    </div>
  );
}
