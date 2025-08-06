import { ReactNode } from 'react';

interface IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  active?: boolean;
}

export function IconButton({ icon, onClick, active }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-3 flex items-center justify-center rounded-xl transition
        ${active ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
    >
      {icon}
    </button>
  );
}
