import { FileBar } from './bars/FileBar';
import { EditBar } from './bars/EditBar';
import { AlignmentBar } from './bars/AlignmentBar';
import { GroupBar } from './bars/GroupBar';
import { LockBar } from './bars/LockBar';
import { ExtraBar } from './bars/ExtraBar';
import { UndoRedoBar } from './bars/UndoRedoBar';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { OverflowToolbar } from '@/components/molecules/OverflowToolbar';

const TOOLBAR_SECTIONS = [
    { id: 'file', component: FileBar },
    { id: 'undoredo', component: UndoRedoBar },
    { id: 'edit', component: EditBar },
    { id: 'alignment', component: AlignmentBar },
    { id: 'group', component: GroupBar },
    { id: 'lock', component: LockBar },
    // zoom: footer only (one place per feature); shortcuts use ZoomBarConfig
    { id: 'extra', component: ExtraBar },
];

const TopToolbar = () => (
    // Groups that do not fit (narrow window / large icon size) move into a "More tools" menu.
    <OverflowToolbar
        className="gap-1 px-1 py-1"
        divider={<GlowDivider />}
        items={TOOLBAR_SECTIONS.map(({ id, component: Section }) => ({ id, node: <Section /> }))}
    />
);

export { TopToolbar };
