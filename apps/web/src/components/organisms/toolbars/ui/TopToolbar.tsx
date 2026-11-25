import { FileBar } from './bars/FileBar';
import { EditBar } from './bars/EditBar';
import { AlignmentBar } from './bars/AlignmentBar';
import { GroupBar } from './bars/GroupBar';
import { BooleanOperations } from '../../BooleanOperationsDropdown';
import { LockBar } from './bars/LockBar';
import { ExtraBar } from './bars/ExtraBar';
import { UndoRedoBar } from './bars/UndoRedoBar';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { OverflowToolbar } from '@/components/molecules/OverflowToolbar';

const TOOLBAR_SECTIONS = [
    { id: 'file', label: 'File', component: FileBar },
    { id: 'undoredo', label: 'History', component: UndoRedoBar },
    { id: 'edit', label: 'Edit', component: EditBar },
    { id: 'alignment', label: 'Align & distribute', component: AlignmentBar },
    { id: 'group', label: 'Group', component: GroupBar },
    // Union / Subtract / … : a menu button like the grid options (moved from the footer)
    { id: 'shapeops', label: 'Combine shapes', component: BooleanOperations },
    { id: 'lock', label: 'Lock', component: LockBar },
    // zoom: footer only (one place per feature); shortcuts use ZoomBarConfig
    { id: 'extra', label: 'Grid, snap & help', component: ExtraBar },
];

const TopToolbar = () => (
    // Groups that do not fit (narrow window / large icon size) move into a "More tools" menu.
    <OverflowToolbar
        className="gap-1 px-1 py-1"
        divider={<GlowDivider />}
        items={TOOLBAR_SECTIONS.map(({ id, label, component: Section }) => ({
            id,
            label,
            node: <Section />,
        }))}
    />
);

export { TopToolbar };
