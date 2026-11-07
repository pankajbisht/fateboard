/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { EmptyState } from '@/components/molecules/EmptyState';
import LabeledToggle from '@/components/molecules/LabeledToggle';
import { Icon } from '@/components/atoms/Icon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@store';
import {
    FONT_TEMPLATES,
    FONT_TEMPLATE_CATEGORIES,
    FONT_TEMPLATE_CATEGORY_LABELS,
    type FontTemplate,
    type FontTemplateFilter,
} from './fontTemplates.config';
import { loadTemplateFonts } from './fontLoader';
import {
    addFontTemplate,
    applyFontTemplateToSelection,
    createTemplateFromSelection,
} from './applyFontTemplate';
import {
    loadCustomTemplates,
    removeCustomTemplate,
    saveCustomTemplate,
} from './fontTemplates.storage';
import { PanelAction } from '@/components/molecules/PanelAction';
import { Button } from '@/components/atoms/Button';
import { IconButton } from '@/components/atoms/IconButton';
import { Chip } from '@/components/atoms/Chip';

const normalize = (value: string) => value.trim().toLowerCase();

/* ------------------------------------------------------------------ */
/* One template card (loads its fonts when it scrolls into view)       */
/* ------------------------------------------------------------------ */
function FontTemplateCard({
    template,
    busy,
    onAdd,
    onApplyToSelection,
    onDelete,
}: {
    template: FontTemplate;
    busy: boolean;
    onAdd: (template: FontTemplate) => void;
    onApplyToSelection: (template: FontTemplate) => void;
    onDelete?: (template: FontTemplate) => void;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [fontsReady, setFontsReady] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        let cancelled = false;
        const load = () =>
            void loadTemplateFonts(template.items).then(() => {
                if (!cancelled) setFontsReady(true);
            });

        if (typeof IntersectionObserver === 'undefined') {
            load();
            return () => {
                cancelled = true;
            };
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    observer.disconnect();
                    load();
                }
            },
            { rootMargin: '120px' },
        );
        observer.observe(node);

        return () => {
            cancelled = true;
            observer.disconnect();
        };
    }, [template]);

    return (
        <div
            ref={ref}
            className="overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-line-strong"
        >
            <button
                type="button"
                onClick={() => onAdd(template)}
                disabled={busy}
                aria-label={`Add ${template.name} to the canvas`}
                className="block w-full min-w-0 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60"
                style={{ background: template.background }}
            >
                <div
                    className="min-w-0 space-y-1 transition-opacity"
                    style={{ opacity: fontsReady ? 1 : 0.35 }}
                >
                    {template.items.map((item, index) => {
                        const textAlign = item.textAlign ?? 'left';
                        const isBody = item.role === 'body';

                        return (
                            <div
                                key={`${item.role}-${index}`}
                                style={{
                                    fontFamily: `"${item.fontFamily}", sans-serif`,
                                    fontWeight: item.fontWeight,
                                    fontStyle: item.italic ? 'italic' : 'normal',
                                    color: item.fill,
                                    textTransform: item.uppercase ? 'uppercase' : 'none',
                                    letterSpacing: `${(item.charSpacing ?? 0) / 1000}em`,
                                    lineHeight: item.lineHeight ?? 1.2,
                                    fontSize: Math.max(9, Math.min(item.fontSize * 0.26, 30)),
                                    textAlign,
                                    overflow: 'hidden',
                                    ...(isBody
                                        ? {
                                              display: '-webkit-box',
                                              WebkitLineClamp: 2,
                                              WebkitBoxOrient: 'vertical' as const,
                                          }
                                        : { whiteSpace: 'nowrap', textOverflow: 'ellipsis' }),
                                }}
                            >
                                {item.text}
                            </div>
                        );
                    })}
                </div>
            </button>

            <div className="flex items-center gap-1 border-t border-line bg-surface px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                    {template.name}
                </span>

                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onApplyToSelection(template)}
                    disabled={busy}
                    title="Apply these fonts to the selected text"
                >
                    Apply to selected
                </Button>

                {onDelete && (
                    <IconButton
                        size="sm"
                        tone="danger"
                        icon={<Icon name="trash-can" />}
                        onClick={() => onDelete(template)}
                        aria-label={`Delete ${template.name}`}
                        title="Delete template"
                    />
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Panel                                                              */
/* ------------------------------------------------------------------ */
export function FontTemplatePanel() {
    const canvas = useStore((s: any) => s.canvas);

    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<FontTemplateFilter>('All');
    const [includeSize, setIncludeSize] = useState(false);
    const [custom, setCustom] = useState<FontTemplate[]>(() => loadCustomTemplates());
    const [newName, setNewName] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const messageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(messageTimer.current), []);

    const flash = useCallback((text: string) => {
        setMessage(text);
        clearTimeout(messageTimer.current);
        messageTimer.current = setTimeout(() => setMessage(''), 2500);
    }, []);

    const templates = useMemo(() => [...custom, ...FONT_TEMPLATES], [custom]);

    const filtered = useMemo(() => {
        const search = normalize(query);

        return templates.filter((template) => {
            const matchesCategory = category === 'All' || template.category === category;
            const haystack = normalize(
                `${template.name} ${template.category} ${template.items
                    .map((item) => item.fontFamily)
                    .join(' ')}`,
            );

            return matchesCategory && (!search || haystack.includes(search));
        });
    }, [templates, query, category]);

    const handleAdd = useCallback(
        async (template: FontTemplate) => {
            if (!canvas) {
                flash('The canvas is not ready yet.');
                return;
            }

            setBusyId(template.id);
            try {
                // The selection event fired by addFontTemplate saves history + persists.
                await addFontTemplate(canvas, template);
                flash(`${template.name} added`);
            } catch (error) {
                console.error('Failed to add font template:', error);
                flash('Could not add this template.');
            } finally {
                setBusyId(null);
            }
        },
        [canvas, flash],
    );

    const handleApply = useCallback(
        async (template: FontTemplate) => {
            if (!canvas) {
                flash('The canvas is not ready yet.');
                return;
            }

            setBusyId(template.id);
            try {
                const count = await applyFontTemplateToSelection(canvas, template, {
                    includeSize,
                });

                if (count === 0) {
                    flash('Select one or more text objects first.');
                    return;
                }

                const state = useStore.getState() as any;
                state.saveState?.();
                state.persist?.();
                flash(`Applied to ${count} text ${count === 1 ? 'object' : 'objects'}`);
            } catch (error) {
                console.error('Failed to apply font template:', error);
                flash('Could not apply this template.');
            } finally {
                setBusyId(null);
            }
        },
        [canvas, includeSize, flash],
    );

    const handleSave = useCallback(() => {
        if (!canvas) {
            flash('The canvas is not ready yet.');
            return;
        }

        const name = newName.trim() || `My font set ${custom.length + 1}`;
        const template = createTemplateFromSelection(canvas, name);

        if (!template) {
            flash('Select the text you want to save first.');
            return;
        }

        setCustom(saveCustomTemplate(template));
        setNewName('');
        setCategory('Mine');
        flash(`Saved "${template.name}"`);
    }, [canvas, newName, custom.length, flash]);

    const handleDelete = useCallback((template: FontTemplate) => {
        setCustom(removeCustomTemplate(template.id));
    }, []);

    return (
        <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-surface">
            <div className="shrink-0 space-y-3 border-b border-line p-4">
                <p className="text-caption text-ink-muted">
                    Click a template to add it, or restyle the selected text.
                </p>
                <LabeledToggle
                    label="Also change font size on selected text"
                    checked={includeSize}
                    onChange={setIncludeSize}
                />
            </div>

            {/* Search + categories */}
            <div className="shrink-0 space-y-3 border-b border-line p-4">
                <Input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name or font…"
                    aria-label="Search font templates"
                />

                <div
                    aria-label="Filter templates by category"
                    className="flex min-w-0 gap-1.5 overflow-x-auto pb-1"
                >
                    {FONT_TEMPLATE_CATEGORIES.map((item) => {
                        const active = category === item;

                        return (
                            <Chip key={item} active={active} onClick={() => setCategory(item)}>
                                {FONT_TEMPLATE_CATEGORY_LABELS[item]}
                            </Chip>
                        );
                    })}
                </div>
            </div>

            {/* Only this section scrolls */}
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-label uppercase text-ink-subtle">
                        {FONT_TEMPLATE_CATEGORY_LABELS[category]}
                    </span>
                    <Badge>{filtered.length}</Badge>
                </div>

                {filtered.length > 0 ? (
                    <div className="space-y-3">
                        {filtered.map((template) => (
                            <FontTemplateCard
                                key={template.id}
                                template={template}
                                busy={busyId === template.id}
                                onAdd={handleAdd}
                                onApplyToSelection={handleApply}
                                onDelete={template.custom ? handleDelete : undefined}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon="font"
                        title="No templates found"
                        description={
                            category === 'Mine'
                                ? 'Select some text on the canvas and save it below.'
                                : 'Try another search or category.'
                        }
                    />
                )}
            </div>

            {/* Save the current selection as a template */}
            <div className="shrink-0 space-y-2 border-t border-line bg-surface px-4 py-3">
                <p className="text-label uppercase text-ink-subtle">
                    Save selected text as template
                </p>
                <Input
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') handleSave();
                    }}
                    placeholder="Template name"
                    aria-label="Template name"
                    maxLength={40}
                />
                <PanelAction icon="floppy-disk" onClick={handleSave}>
                    Save as template
                </PanelAction>
                <p role="status" aria-live="polite" className="min-h-4 text-caption text-ink-muted">
                    {message}
                </p>
            </div>
        </div>
    );
}

export default FontTemplatePanel;
