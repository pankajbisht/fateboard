import React from 'react';
import { FileBar } from './bars/FileBar';
import { EditBar } from './bars/EditBar';
import { AlignmentBar } from './bars/AlignmentBar';
import { GroupBar } from './bars/GroupBar';
import { LockBar } from './bars/LockBar';
import { ZoomBar } from './bars/ZoomBar';
import OriginSelector from '@/components/molecules/OriginSelector';
import { ExtraBar } from './bars/ExtraBar';
import { UndoRedoBar } from './bars/UndoRedoBar';
import { GlowDivider } from '@/components/atoms/GlowDivider';

const TOOLBAR_SECTIONS = [
    { id: 'file', component: FileBar },
    // { id: 'undoredo', component: UndoRedoBar },
    { id: 'edit', component: EditBar },
    { id: 'alignment', component: AlignmentBar },
    { id: 'group', component: GroupBar },
    { id: 'lock', component: LockBar },
    { id: 'zoom', component: ZoomBar },
    { id: 'origin', component: OriginSelector },
    { id: 'extra', component: ExtraBar },
];

const TopToolbar = () => {
    return (
        <div className="flex items-center gap-2 px-2 py-1 bg-panel shadow-toolbar">
            {TOOLBAR_SECTIONS.map((section, index) => {
                const SectionComponent = section.component;
                return (
                    <React.Fragment key={section.id}>
                        <SectionComponent />
                        {/* Separator except after last */}
                        {index < TOOLBAR_SECTIONS.length - 1 && (
                            <>
                                <GlowDivider />
                            </>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export { TopToolbar };
