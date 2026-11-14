import { PanelLayout } from '@/components/templates/PanelLayout';
import {
    leftPanelSize,
    panelInner,
    phoneSheet,
    phoneSheetClosed,
    sidePanelFrame,
} from '../sidebar.const';
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
            style={
                {
                    '--panel-w': `${visible ? width : 0}px`,
                    '--panel-full': `${width}px`,
                    minWidth: 0,
                } as React.CSSProperties
            }
            className={`${sidePanelFrame} ${leftPanelSize} border-r ${phoneSheet} ${visible ? 'max-lg:shadow-xl' : phoneSheetClosed}`}
        >
            {visible && item && (
                <div className={`flex min-h-0 flex-col ${panelInner}`}>
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
