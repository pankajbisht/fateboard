import LayersPanel from './LayersPanel';
import { PageLayersSection } from './PageLayersSection';

/**
 * Left rail "Layers" (2026-11-17): the page's layers and folders on top (PageLayersSection), the objects of
 * the page below (LayersPanel, one row per object, unchanged).
 */
export default function LayersTab() {
    return (
        <div className="flex h-full min-h-0 w-full min-w-64 flex-col bg-surface">
            <PageLayersSection />
            <h2 className="border-t border-line px-4 pt-3 text-sm font-semibold text-ink">
                Objects
            </h2>
            <div className="min-h-0 flex-1">
                <LayersPanel />
            </div>
        </div>
    );
}
