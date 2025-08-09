import EIconButton from '../atoms/EIconButton';

const SidebarButtonGroup = ({ onAddRectangle, onAddCircle, onAddText, onTogglePanel, isPanelOpen, onAddEllipse }) => (
  <aside className="flex flex-col gap-4 fixed top-2 left-2 bg-stone-100 p-2 rounded-md shadow-lg z-50">
    <EIconButton icon="fa-solid fa-plus" onClick={onTogglePanel} isActive={isPanelOpen} />
    <EIconButton icon="fa-regular fa-square" onClick={onAddRectangle} />
    <EIconButton icon="fa-regular fa-circle" onClick={onAddCircle} />
    <EIconButton icon="fa-regular fa-circle transform scale-x-120" onClick={onAddEllipse} />
    <EIconButton icon="fa-regular fa-font" onClick={onAddText} />
  </aside>
);

export default SidebarButtonGroup;
