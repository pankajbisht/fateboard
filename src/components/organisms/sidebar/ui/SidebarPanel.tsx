import { PanelLayout } from '@/components/templates/PanelLayout';
import { sidePanelFrame } from '../sidebar.const';
import type { SidebarPanelItem } from '../../editorsidebar/editorsidebar.type';

interface SidebarPanelProps {
    item: SidebarPanelItem | null;
    expanded: boolean;
    width: number;
    onClose: () => void;
}

export function SidebarPanel({ item, expanded, width, onClose }: SidebarPanelProps) {
    const visible = expanded && item !== null;

    return (
        <section
            aria-label={item ? `${item.label} panel` : 'Editor panel'}
            aria-hidden={!visible}
            inert={!visible}
            style={{
                width: visible ? width : 0,
                minWidth: 0,
            }}
            className={`${sidePanelFrame} border-r`}
        >
            {visible && item && (
                <div className="flex h-full min-h-0 flex-col" style={{ width }}>
                    <PanelLayout
                        key={item.id}
                        title={item.label}
                        icon={item.icon}
                        onClose={onClose}
                        fullSize={item.fullSize}
                    >
                        {item.panel}
                    </PanelLayout>
                </div>
            )}
        </section>
    );
}
