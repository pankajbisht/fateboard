import type { ReactNode, ButtonHTMLAttributes } from "react";

interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  active?: boolean;
}

export function IconButton({
  icon,
  active,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      className={`flex items-center justify-center cursor-pointer transition
        h-8 w-8 p-2 rounded-sm
        ${active
          ? "bg-blue-500 text-white hover:bg-blue-600"
          : "hover:bg-stone-200"}
        ${className ?? ""}
      `}
    >
      {icon}
    </button>
  );
}
