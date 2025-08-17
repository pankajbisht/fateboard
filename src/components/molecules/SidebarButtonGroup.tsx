import EIconButton from '../atoms/EIconButton';

const SidebarButtonGroup = ({ onAddRectangle, onAddCircle, onAddText, onTogglePanel, isPanelOpen, onAddEllipse }) => (
  <aside className="flex flex-col gap-4 fixed top-20 left-2 bg-stone-100 p-2 rounded-md shadow-lg z-50">
    <EIconButton icon="fa-solid fa-plus" onClick={onTogglePanel} isActive={isPanelOpen} />
    <EIconButton icon="fa-regular fa-shapes" onClick={onAddRectangle} />
    {/*<EIconButton icon="fa-regular fa-circle" onClick={onAddCircle} />*/}
    {/*<EIconButton icon="fa-regular fa-circle transform scale-x-120" onClick={onAddEllipse} />*/}
    <EIconButton icon="fa-regular fa-font" onClick={onAddText} />
    {/*<i class="fas fa-camera rotate-45 scale-125 text-red-500"></i>*/}

    <EIconButton icon="fa-light fa-pencil" />
  </aside>
);

export default SidebarButtonGroup;
