import SidebarButtonGroup from '../molecules/SidebarButtonGroup';

const PrimarySidebar = ({ onAddRectangle, onAddCircle, onAddText, onTogglePanel, isPanelOpen }) => (
  <SidebarButtonGroup
    onAddRectangle={onAddRectangle}
    onAddCircle={onAddCircle}
    onAddText={onAddText}
    onTogglePanel={onTogglePanel}
    isPanelOpen={isPanelOpen}
  />
);

export default PrimarySidebar;
