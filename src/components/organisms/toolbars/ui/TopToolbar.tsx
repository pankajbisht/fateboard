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

export const ToolbarDivider = () => (
    <div className="relative mx-2 h-5 w-px">
        <div className="absolute inset-0 bg-stone-400/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-transparent" />
    </div>
);

export const InsetDivider = () => (
    <div className="relative mx-2 h-6 w-px">
        <div className="absolute inset-0 bg-stone-500/30" />
        <div className="absolute left-full inset-y-0 w-px bg-white/50" />
    </div>
);

export const GlowDivider = () => (
    <div className="group relative mx-3 flex h-6 w-[2px] items-center justify-center">
        {/* Glow */}
        <div className="absolute inset-y-0 w-[6px] rounded-full bg-blue-400/20 blur-md transition group-hover:bg-blue-400/40" />

        {/* Core line */}
        <div className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-blue-400/70 to-transparent transition-opacity group-hover:via-blue-400" />

        {/* Highlight */}
        <div className="absolute inset-y-2 w-px bg-white/50 opacity-60 group-hover:opacity-100 transition" />
    </div>
);

export const GlowDivider1 = () => (
    <div className="relative mx-3 flex h-6 w-[2px] items-center justify-center">
        {/* Outer soft glow */}
        <div className="absolute inset-y-0 w-[6px] rounded-full bg-blue-400/30 blur-md" />

        {/* Core gradient line */}
        <div className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-blue-400/80 to-transparent" />

        {/* Inner highlight */}
        <div className="absolute inset-y-2 w-px bg-white/60" />
    </div>
);

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
