import { useStore } from '@store';
import { ShapeToolsHeader } from '../../../ShapeToolsHeader';
import { PenOptions } from './PenOptions';
import { PencilOptions } from './PencilOptions';
import { NibOptions } from './NibOptions';
import { BucketOptions } from './BucketOptions';
import { SprayOptions } from './SprayOptions';
import { CopySprayOptions } from './CopySprayOptions';
import { LassoOptions } from './LassoOptions';
import { GeometryOptions } from './GeometryOptions';
import { BrushOptions } from './BrushOptions';

/**
 * The property bar under the command bar (Illustrator's control bar): the active tool's options while Pen
 * (P), Pencil (Shift + P), Spray (Shift + B; Copy mode = CopySprayOptions), Paint bucket (G), Lasso (L), Geometry (D), a brush or the
 * eraser is active, else the selection's X / Y / W / H. Every bar starts with its icon + label. Colors come
 * from the dock palette (`PaintTargetSwatch`); each change applies to the next path / stroke.
 */
export function ToolContextBar() {
    const tool = useStore((s) => s.activeTool);
    const brush = useStore((s) => s.brush);
    if (tool === 'pen') return <PenOptions />;
    if (tool === 'pencil' || tool === 'laser') return <PencilOptions />; // Laser = Pencil › Mode › Laser
    if (tool === 'bucket') return <BucketOptions />;
    if (tool === 'spray') return <SprayOptions />;
    if (tool === 'copySpray') return <CopySprayOptions />;
    if (tool === 'lasso') return <LassoOptions />;
    if (tool === 'geometry') return <GeometryOptions />;
    if (tool === 'draw' && brush === 'nib') return <NibOptions />; // Calligraphy pen
    if (tool === 'draw') return <BrushOptions />;
    return <ShapeToolsHeader />;
}
