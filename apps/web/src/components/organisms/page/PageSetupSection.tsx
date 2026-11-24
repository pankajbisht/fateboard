import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { Button } from '@/components/atoms/Button';
import { NumberField } from '@/components/atoms/NumberField';
import { PanelSection } from '@/components/molecules/PanelSection';
import { SwitchField } from '@/components/molecules/LabeledToggle';
import { SelectField } from '@/components/molecules/SelectField';
import { useUnit } from '@hooks/useUnit';
import { fromUnit, toUnit, unitPrecision } from '@/lib/units';
import { normalizePageRole, type PageMargins } from '@/lib/document/pageSetup';

const MARGINS: { key: keyof PageMargins; label: string }[] = [
    { key: 'top', label: 'Top' },
    { key: 'bottom', label: 'Bottom' },
    { key: 'inside', label: 'Inside' },
    { key: 'outside', label: 'Outside' },
];

type PageRec = { id: string; name: string; canvasJSON?: Record<string, unknown> | null };

/**
 * Page setup (InDesign style, 2026-11-17), in the Pages panel: margins, columns, bleed, slug, facing pages, guides,
 * crop marks,
 * master pages and page numbers. Store: createDocumentSlice (saved per page).
 */
export function PageSetupSection() {
    const unit = useUnit();
    const setup = useStore((s) => s.pageSetup);
    const role = useStore((s) => s.pageRole);
    const masterId = useStore((s) => s.pageMasterId);
    const pages = useStore((s) => s.pages) as PageRec[];
    const currentPageId = useStore((s) => s.currentPageId);
    const a = useStore(
        useShallow((s) => ({
            setSetup: s.setPageSetup,
            setRole: s.setPageRole,
            applyMaster: s.applyMasterPage,
            insertNumber: s.insertPageNumber,
        })),
    );
    const masters = useMemo(
        () =>
            pages.filter(
                (p) =>
                    p.id !== currentPageId &&
                    normalizePageRole(p.canvasJSON?.pageRole) === 'master',
            ),
        [pages, currentPageId],
    );

    const unitLabel = unit === 'px' ? undefined : unit;
    const length = (label: string, px: number, onPx: (v: number) => void) => (
        <NumberField
            label={label}
            aria-label={label}
            unit={unitLabel}
            precision={unitPrecision(unit)}
            min={0}
            value={toUnit(px, unit)}
            onCommit={(v) => onPx(fromUnit(v, unit))}
            className="w-full"
        />
    );

    return (
        <PanelSection title="Page setup" collapsible defaultOpen={false}>
            <div className="grid grid-cols-2 gap-2">
                {MARGINS.map(({ key, label }) =>
                    length(`${label} margin`, setup.margins[key], (v) =>
                        a.setSetup({ margins: { [key]: v } }),
                    ),
                )}
                <NumberField
                    label="Columns"
                    aria-label="Columns"
                    min={1}
                    max={24}
                    precision={0}
                    value={setup.columns}
                    onCommit={(v) => a.setSetup({ columns: v })}
                    className="w-full"
                />
                {length('Column gap', setup.gutter, (v) => a.setSetup({ gutter: v }))}
                {length('Bleed', setup.bleed, (v) => a.setSetup({ bleed: v }))}
                {length('Slug', setup.slug, (v) => a.setSetup({ slug: v }))}
            </div>
            <SwitchField
                label="Show guides"
                hint="Margins (magenta), columns (violet), bleed (red) and slug (blue)"
                checked={setup.guides}
                onChange={(guides) => a.setSetup({ guides })}
            />
            <SwitchField
                label="Show crop marks"
                hint="Trim lines at the page corners; Export can add them to the file"
                checked={setup.cropMarks}
                onChange={(cropMarks) => a.setSetup({ cropMarks })}
            />
            <SwitchField
                label="Facing pages"
                hint="Book spreads: inside margins at the spine, page 1 on the right"
                checked={setup.facing}
                onChange={(facing) => a.setSetup({ facing }, true)}
            />
            <Button variant="secondary" size="sm" onClick={() => a.setSetup({}, true)}>
                Apply this setup to all pages
            </Button>
            <SwitchField
                label="This page is a master page"
                hint="Its content is drawn under the pages that use it"
                checked={role === 'master'}
                onChange={(on) => a.setRole(on ? 'master' : 'page')}
            />
            {role !== 'master' && (
                <SelectField<string>
                    label="Master page"
                    options={[
                        { value: '', label: 'None' },
                        ...masters.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                    value={masterId ?? ''}
                    onChange={(id) => a.applyMaster(id || null)}
                />
            )}
            <Button variant="secondary" size="sm" onClick={() => a.insertNumber()}>
                Insert page number
            </Button>
        </PanelSection>
    );
}
