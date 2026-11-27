import { lazy, Suspense } from 'react';
import { BrushPickerPanel } from '../brush/BrushPickerPanel';
import { TextPanel } from '../TextPanel';
import { ShapePanel } from '../ShapePanel';
import { shortcut } from '@/lib/utils/isMac';

// rare panel: its own chunk (runtime-performance P5)
const ComicPanel = lazy(() => import('../comic/ComicPanel'));
const NotesPanel = lazy(() => import('../notes/NotesPanel'));
const CharactersPanel = lazy(() => import('../character/CharactersPanel'));
const SceneObjectsPanel = lazy(() => import('../props/SceneObjectsPanel'));

/**
 * Left rail. Pen, Pencil and Brush are one block (`group: 'draw'`, separators around it); the Laser is
 * Pencil › Mode › Laser (K); Pages and Layers are right-dock tabs (owner, 2026-11-28).
 */
const editorsidebarconfig = [
    {
        id: 'select',
        shortcut: 'V',
        label: 'Select',
        icon: 'arrow-pointer',
        kind: 'action',
    },
    {
        id: 'pan',
        shortcut: 'H',
        label: 'Hand',
        icon: 'hand',
        kind: 'action',
    },
    {
        id: 'node',
        shortcut: 'A',
        label: 'Node Tool',
        icon: 'node-tool',
        kind: 'action',
    },
    {
        id: 'pen',
        shortcut: 'P',
        label: 'Pen',
        icon: 'pen-tool',
        kind: 'action',
        group: 'draw',
    },
    {
        id: 'pencil',
        shortcut: shortcut('⇧P', 'Shift+P'),
        label: 'Pencil',
        icon: 'pencil-line',
        kind: 'action',
        group: 'draw',
    },
    {
        id: 'brush',
        shortcut: 'B',
        label: 'Brush',
        icon: 'brush-tool',
        kind: 'panel',
        group: 'draw',
        activateTool: 'draw',
        panel: <BrushPickerPanel />,
    },
    {
        id: 'lasso',
        shortcut: 'L',
        label: 'Lasso',
        icon: 'lasso',
        kind: 'action',
    },
    {
        id: 'bucket',
        shortcut: 'G',
        label: 'Paint bucket',
        icon: 'paint-bucket',
        kind: 'action',
    },
    {
        id: 'spray',
        shortcut: shortcut('⇧B', 'Shift+B'),
        label: 'Spray',
        icon: 'spray-can',
        kind: 'action',
    },
    {
        id: 'drafter',
        shortcut: 'D',
        label: 'Drafter',
        icon: 'drafter',
        kind: 'action',
    },
    {
        id: 'shapes',
        label: 'Shapes',
        icon: 'shapes',
        kind: 'panel',
        panel: <ShapePanel />,
    },
    {
        id: 'text',
        label: 'Text',
        icon: 'font',
        kind: 'panel',
        activateTool: 'text',
        panel: <TextPanel />,
    },
    {
        id: 'notes',
        label: 'Notes',
        icon: 'note',
        kind: 'panel',
        panel: (
            <Suspense fallback={null}>
                <NotesPanel />
            </Suspense>
        ),
    },
    {
        id: 'characters',
        label: 'Characters',
        icon: 'character',
        kind: 'panel',
        panel: (
            <Suspense fallback={null}>
                <CharactersPanel />
            </Suspense>
        ),
    },
    {
        id: 'sceneObjects',
        label: 'Scene Objects',
        icon: 'scene-objects',
        kind: 'panel',
        panel: (
            <Suspense fallback={null}>
                <SceneObjectsPanel />
            </Suspense>
        ),
    },
    {
        id: 'comic',
        label: 'Comic',
        icon: 'comic-panels',
        kind: 'panel',
        panel: (
            <Suspense fallback={null}>
                <ComicPanel />
            </Suspense>
        ),
    },
    // {
    //     id: 'assets',
    //     label: 'Assets',
    //     icon: 'images',
    //     kind: 'panel',
    //     panel: <AssetsPanel />,
    // },
    // {
    //     id: 'settings',
    //     label: 'Settings',
    //     icon: 'gear',
    //     kind: 'panel',
    //     panel: <SettingsPanel />,
    // },
];

export default editorsidebarconfig;
