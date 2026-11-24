import ExportCanvas from '../organisms/effects/ui/ExportCanvas';
import { PathEffects } from '../organisms/effects/ui/PathEffects';
import { RepeatAlongPath } from '../organisms/effects/ui/RepeatAlongPath';
import { RepeatRadially } from '../organisms/effects/ui/RepeatRadially';
import Filters from '../organisms/filter/ui/Filters';
import { FillShadowPanel } from '../organisms/FillShadowPanel';
import { SymmetryPanel } from '../organisms/SymmetryPanel';
import TemplateGallery from '../organisms/effects/ui/TemplateGallery';
import FontTemplatePanel from '../organisms/fonts';
import { AutomataPanel } from '../organisms/generators/AutomataPanel';
import { FractalPanel } from '../organisms/generators/FractalPanel';
import { MacroPanel } from '../organisms/generators/MacroPanel';

export const TABS_CONFIG = [
    {
        id: 'appearance',
        label: 'Fill & Shadow',
        icon: 'palette',
        closable: false,
        content: () => <FillShadowPanel />,
    },
    {
        id: 'templates',
        label: 'Templates',
        icon: 'templates',
        closable: false,
        fullSize: true,
        content: () => <TemplateGallery />,
    },
    {
        id: 'fonttemplates',
        label: 'Font Templates',
        icon: 'text-height',
        closable: false,
        fullSize: true,
        content: () => <FontTemplatePanel />,
    },
    {
        id: 'tiling',
        label: 'Tiling Tools',
        icon: 'tiling',
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
        id: 'symmetry',
        label: 'Symmetry',
        icon: 'kaleidoscope',
        closable: false,
        content: () => <SymmetryPanel />,
    },
    {
        id: 'along-path',
        label: 'Along Path',
        icon: 'along-path',
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
        id: 'fractals',
        label: 'Fractals',
        icon: 'snowflake',
        closable: false,
        content: () => <FractalPanel />,
    },
    {
        id: 'automata',
        label: 'Cellular Automata',
        icon: 'cellular-automata',
        closable: false,
        content: () => <AutomataPanel />,
    },
    {
        id: 'macro',
        label: 'Macro',
        icon: 'macro',
        closable: false,
        content: () => <MacroPanel />,
    },

    {
        id: 'export',
        label: 'Export',
        icon: 'file-export',
        closable: false,
        content: () => <ExportCanvas />,
    },

    // Animate moved to the bottom timeline dock (TimelineDock, 2026-11-17)
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
