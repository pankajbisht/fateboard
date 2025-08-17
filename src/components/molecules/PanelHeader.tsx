import { CloseButton } from "../atoms/CloseButton.tsx";

export function PanelHeader({ title, onClose }) {
    return (
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <CloseButton onClick={onClose} />
      </div>
    );
}