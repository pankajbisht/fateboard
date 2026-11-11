import AnimationPanel from '../organisms/animation/AnimationPanel';
import ExportCanvas from '../organisms/effects/ui/ExportCanvas';
import { PathEffects } from '../organisms/effects/ui/PathEffects';
import { RepeatAlongPath } from '../organisms/effects/ui/RepeatAlongPath';
import { RepeatRadially } from '../organisms/effects/ui/RepeatRadially';
import Filters from '../organisms/filter/ui/Filters';
import { FillShadowPanel } from '../organisms/FillShadowPanel';

export const TABS_CONFIG = [
    {
        id: 'appearance',
        label: 'Fill & Shadow',
        icon: 'palette',
        closable: false,
        content: () => <FillShadowPanel />,
    },
    {
        id: 'tiling',
        label: 'Tiling Tools',
        icon: 'screwdriver-wrench',
        closable: false,
        content: () => <PathEffects />,
    },
    {
        id: 'rotate',
        label: 'Rotate Tools',
        icon: 'rotate',
        closable: false,
        content: () => <RepeatRadially />,
    },

    {
        id: 'along-path',
        label: 'Along Path',
        icon: 'screwdriver-wrench',
        closable: false,
        content: () => <RepeatAlongPath />,
    },
    {
        id: 'filter',
        label: 'Filter Tools',
        icon: 'sliders',
        closable: false,
        content: () => <Filters />,
    },

    {
        id: 'export',
        label: 'Export',
        icon: 'file-export',
        closable: false,
        content: () => <ExportCanvas />,
    },

    {
        id: 'animate',
        label: 'Animate',
        icon: 'video',
        closable: false,
        content: () => <AnimationPanel />,
    },
    // {
    //     id: 'svgviewer',
    //     label: 'SVG Viewer',
    //     icon: 'code',
    //     closable: false,
    //     content: () => <SVGViewer />,
    // },
    // {
    //     id: 'layer',
    //     label: 'Layers',
    //     icon: 'layer-group',
    //     closable: false,
    //     content: () => <div>Appearance</div>,
    // },
    // {
    //     id: 'align',
    //     label: 'Align and Distribute',
    //     icon: 'align-left',
    //     closable: true,
    //     content: () => <div>Align and Distribute</div>,
    // },
    // {
    //     id: 'fill',
    //     label: 'Fill and Stroke',
    //     icon: 'palette',
    //     closable: true,
    //     content: () => <div>Fill and Stroke</div>,
    // },
] as const;
