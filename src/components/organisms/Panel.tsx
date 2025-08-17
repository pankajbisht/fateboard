import clsx from "clsx";

export function Panel({ isOpen, position, from, children }) {
    if (!position) return null;

    return (
      <aside
        style={{
          position: "fixed",
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        className={clsx(
          "bg-stone-100 rounded-md shadow-lg w-72 p-4 z-50 transform transition-all duration-300 ease-out",
          isOpen
            ? "opacity-100 translate-x-0"
            : from === "left"
            ? "-translate-x-4 opacity-0 pointer-events-none"
            : "translate-x-4 opacity-0 pointer-events-none"
        )}
      >
        {children}
      </aside>
    );
}