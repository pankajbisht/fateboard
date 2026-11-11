import { DrawPanel } from '../DrawPanel';
import TemplateGallery from '../effects/ui/TemplateGallery';
import { TextPanel } from '../TextPanel';
import FontTemplatePanel from '../fonts';
import LayersPanel from '../layer/LayersPanel';
import PagePanel from '../page/PagePanel';
import { ShapePanel } from '../ShapePanel';
import { shortcut } from '@/lib/utils/isMac';

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
        icon: 'share-nodes',
        kind: 'action',
    },
    {
        id: 'pen',
        shortcut: 'P',
        label: 'Pen',
        icon: 'pen-tool',
        kind: 'action',
    },
    {
        id: 'pencil',
        shortcut: shortcut('⇧P', 'Shift+P'),
        label: 'Pencil',
        icon: 'pencil-line',
        kind: 'action',
    },
    {
        id: 'laser',
        shortcut: 'K',
        label: 'Laser pointer',
        icon: 'laser-pointer',
        kind: 'action',
    },
    {
        id: 'draw',
        label: 'Draw',
        icon: 'pencil',
        kind: 'panel',
        activateTool: 'draw',
        panel: <DrawPanel />,
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
        id: 'templates',
        label: 'Templates',
        icon: 'table-cells-large',
        kind: 'panel',
        fullSize: true,
        panel: <TemplateGallery />,
    },
    {
        id: 'fonttemplates',
        label: 'Font Templates',
        icon: 'text-height',
        kind: 'panel',
        fullSize: true,
        panel: <FontTemplatePanel />,
    },
    {
        id: 'Pages',
        label: 'Pages',
        icon: 'file-lines',
        kind: 'panel',
        panel: <PagePanel />,
    },
    {
        id: 'layers',
        label: 'Layers',
        icon: 'layer-group',
        kind: 'panel',
        fullSize: true,
        panel: <LayersPanel />,
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
