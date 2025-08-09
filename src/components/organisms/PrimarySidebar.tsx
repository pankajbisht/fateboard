import SidebarButtonGroup from '../molecules/SidebarButtonGroup';

const PrimarySidebar = ({ onAddRectangle, onAddCircle, onAddText, onTogglePanel, isPanelOpen, onAddEllipse }) => (
  <SidebarButtonGroup
    onAddRectangle={onAddRectangle}
    onAddCircle={onAddCircle}
    onAddText={onAddText}
    onTogglePanel={onTogglePanel}
    isPanelOpen={isPanelOpen}
    onAddEllipse={onAddEllipse}
  />
);

export default PrimarySidebar;
