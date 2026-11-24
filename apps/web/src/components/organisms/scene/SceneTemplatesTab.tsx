import { memo, useMemo, useState } from 'react';
import { useStore } from '@store';
import { renderScene } from '@/scene/render/renderScene';
import { sceneSvg } from '@/scene/render/toSvg';
import { newScene } from '@/scene/schema/parse';
import { applyTemplate } from '@/scene/templates/apply';
import { TEMPLATES } from '@/scene/templates/registry';
import { Input } from '../../atoms/Input';
import { Button } from '../../atoms/Button';
import { PanelSection } from '../../molecules/PanelSection';
import { SceneLibrary } from './SceneLibrary';

const PAGE = 12;

/** Pictures of the templates, made once each when first shown (not 30 scenes at once). */
const thumbs = new Map<string, string>();
function thumbOf(id: string): string {
    let url = thumbs.get(id);
    if (!url) {
        url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sceneSvg(renderScene(applyTemplate(newScene(), id)), 240))}`;
        thumbs.set(id, url);
    }
    return url;
}

const Thumb = memo(function Thumb({ id }: { id: string }) {
    const src = useMemo(() => thumbOf(id), [id]);
    return (
        <img src={src} alt="" width={240} height={135} className="block h-auto w-full rounded-sm" />
    );
});

/** 30 ready scenes: pick one to replace the place, cast, camera and frame (one undo step). */
export function SceneTemplatesTab() {
    const edit = useStore((s) => s.editStudioScene);
    const [query, setQuery] = useState('');
    const [limit, setLimit] = useState(PAGE);
    const found = useMemo(() => TEMPLATES.search(query), [query]);
    const shown = found.slice(0, limit);
    return (
        <div className="flex flex-col gap-4">
            <SceneLibrary />
            <PanelSection
                title={`Templates (${TEMPLATES.all.length})`}
                description="Start from a ready scene, then change anything. Undo brings your scene back."
            >
                <Input
                    size="sm"
                    aria-label="Search templates"
                    placeholder="Search (school, picnic, night, team…)"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setLimit(PAGE);
                    }}
                />
                <p role="status" className="text-caption text-ink-muted">
                    {found.length === 0 ? 'No template matches.' : `${found.length} templates`}
                </p>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Templates">
                    {shown.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            title={`Use the "${t.name}" template`}
                            onClick={() => edit({ kind: 'template', id: t.id })}
                            className="flex flex-col gap-1 rounded-md border border-line bg-surface p-1 text-left text-xs text-ink hover:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                        >
                            <Thumb id={t.id} />
                            <span className="px-0.5 font-medium">{t.name}</span>
                            <span className="px-0.5 text-ink-muted">
                                {t.cast.length} {t.cast.length === 1 ? 'person' : 'people'}
                            </span>
                        </button>
                    ))}
                </div>
                {found.length > shown.length && (
                    <Button variant="secondary" size="sm" onClick={() => setLimit(limit + PAGE)}>
                        Show more ({found.length - shown.length} left)
                    </Button>
                )}
            </PanelSection>
        </div>
    );
}

export default SceneTemplatesTab;
