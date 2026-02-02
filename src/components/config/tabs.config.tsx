import { EffectsPanel } from '../organisms/effects';
import ExportCanvas from '../organisms/effects/ui/ExportCanvas';
import Filters from '../organisms/filter/ui/Filters';

export const TABS_CONFIG = [
    {
        id: 'effects',
        label: 'Edit Tools',
        icon: 'fa-solid fa-screwdriver-wrench',
        closable: false,
        content: () => <EffectsPanel />,
    },

    {
        id: 'filter',
        label: 'Filter Tools',
        icon: 'fa-solid fa-sliders',
        closable: false,
        content: () => <Filters />,
    },

    {
        id: 'export',
        label: 'Export',
        icon: 'fa-solid fa-file-export',
        closable: false,
        content: () => <ExportCanvas />,
    },
    // {
    //     id: 'svgviewer',
    //     label: 'SVG Viewer',
    //     icon: 'fa-solid fa-code',
    //     closable: false,
    //     content: () => <SVGViewer />,
    // },
    // {
    //     id: 'layer',
    //     label: 'Layers',
    //     icon: 'fa-solid fa-layer-group',
    //     closable: false,
    //     content: () => <div>Appearance</div>,
    // },
    // {
    //     id: 'align',
    //     label: 'Align and Distribute',
    //     icon: 'fa-solid fa-align-left',
    //     closable: true,
    //     content: () => <div>Align and Distribute</div>,
    // },
    // {
    //     id: 'fill',
    //     label: 'Fill and Stroke',
    //     icon: 'fa-solid fa-palette',
    //     closable: true,
    //     content: () => <div>Fill and Stroke</div>,
    // },
] as const;
