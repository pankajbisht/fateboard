import type { ReactNode } from "react";

interface IconButtonProps {
  icon: ReactNode;
  title?: string;
  onClick?: () => void;
  active?: boolean;
}

export function IconButton({ icon, title, onClick, active }: IconButtonProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex items-center justify-center cursor-pointer transition h-8 w-8 p-2 rounded-sm
        ${active ? 'bg-blue-500 text-white hover:bg-blue-600' : 'hover:bg-stone-200'}`}
    >
      {icon}
    </button>
  );
}
