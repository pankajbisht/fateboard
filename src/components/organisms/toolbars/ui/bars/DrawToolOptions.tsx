import { useStore } from '@store';
import { ShapeToolsHeader } from '../../../ShapeToolsHeader';
import { PenOptions } from './PenOptions';
import { PencilOptions } from './PencilOptions';
import { NibOptions } from './NibOptions';
import { BucketOptions } from './BucketOptions';
import { SprayOptions } from './SprayOptions';
import { LassoOptions } from './LassoOptions';
import { DrafterOptions } from './DrafterOptions';

/**
 * The context row under the top toolbar: the selection's X / Y / W / H normally, the active drawing
 * tool's options while Pen (P), Pencil (Shift + P), Spray (Shift + B), Paint bucket (G), Lasso (L), Drafter (D) or the Calligraphy pen brush is active (Illustrator's control bar). Colors
 * come from the dock palette (`PaintTargetSwatch`); each change applies to the next path / stroke.
 */
export function ToolContextBar() {
    const tool = useStore((s) => s.activeTool);
    const brush = useStore((s) => s.brush);
    if (tool === 'pen') return <PenOptions />;
    if (tool === 'pencil') return <PencilOptions />;
    if (tool === 'bucket') return <BucketOptions />;
    if (tool === 'spray') return <SprayOptions />;
    if (tool === 'lasso') return <LassoOptions />;
    if (tool === 'drafter') return <DrafterOptions />;
    if (tool === 'draw' && brush === 'nib') return <NibOptions />; // Calligraphy pen
    return <ShapeToolsHeader />;
}
