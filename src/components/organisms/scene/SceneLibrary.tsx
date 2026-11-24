import { memo, useEffect, useMemo } from 'react';
import { useStore } from '@store';
import { renderScene } from '@/scene/render/renderScene';
import { sceneSvg } from '@/scene/render/toSvg';
import type { Scene } from '@/scene/schema/types';
import { Icon } from '../../atoms/Icon';
import { IconButton } from '../../atoms/IconButton';
import { EmptyState } from '../../molecules/EmptyState';
import { PanelSection } from '../../molecules/PanelSection';
import { focusStudio } from '../character/studioFocus';

/** A picture of a saved scene, made once per version of it (the key changes when the scene does). */
const thumbs = new Map<string, string>();
const keyOf = (s: Scene) => {
    const json = JSON.stringify(s);
    let h = 5381;
    for (let i = 0; i < json.length; i++) h = ((h << 5) + h + json.charCodeAt(i)) | 0;
    return `${s.id}:${(h >>> 0).toString(36)}`;
};

const Thumb = memo(function Thumb({ scene }: { scene: Scene }) {
    const src = useMemo(() => {
        const key = keyOf(scene);
        let url = thumbs.get(key);
        if (!url) {
            url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sceneSvg(renderScene(scene), 240))}`;
            thumbs.set(key, url);
        }
        return url;
    }, [scene]);
    return (
        <img src={src} alt="" width={240} height={135} className="block h-auto w-full rounded-sm" />
    );
});

/** Your saved scenes: open one (replaces the scene being edited, one undo step) or delete it (asks first). */
export function SceneLibrary() {
    const library = useStore((s) => s.sceneLibrary);
    const status = useStore((s) => s.sceneLibraryStatus);
    const load = useStore((s) => s.loadSceneLibrary);
    const edit = useStore((s) => s.editStudioScene);
    const remove = useStore((s) => s.deleteSavedScene);
    const confirmDialog = useStore((s) => s.confirmDialog);
    useEffect(() => {
        if (status === 'idle') void load();
    }, [status, load]);

    const ask = async (scene: Scene) => {
        const ok = await confirmDialog({
            title: `Delete "${scene.name}"?`,
            message: 'It is removed from your saved scenes. Scenes already on pages stay.',
            confirmLabel: 'Delete',
            tone: 'danger',
        });
        if (ok) await remove(scene.id);
        // the deleted card's button is gone: keep the keyboard in the studio (Esc, undo)
        focusStudio();
    };

    return (
        <PanelSection
            title={`Your scenes${library.length ? ` (${library.length})` : ''}`}
            description="Use “Save to my scenes” in the top bar."
        >
            {status === 'error' ? (
                <p role="alert" className="text-caption text-danger">
                    Your saved scenes could not be read.
                </p>
            ) : library.length === 0 ? (
                <EmptyState
                    icon="image"
                    title="No saved scenes yet"
                    description="Save one and it is here in every project."
                />
            ) : (
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Your scenes">
                    {library.map((scene) => (
                        <div key={scene.id} className="relative">
                            <button
                                type="button"
                                title={`Open "${scene.name}"`}
                                onClick={() => edit({ kind: 'load', scene })}
                                className="flex w-full flex-col gap-1 rounded-md border border-line bg-surface p-1 text-left text-xs text-ink hover:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                            >
                                <Thumb scene={scene} />
                                <span className="truncate px-0.5 font-medium">{scene.name}</span>
                            </button>
                            <IconButton
                                size="sm"
                                tone="danger"
                                icon={<Icon name="trash-can" />}
                                aria-label={`Delete ${scene.name}`}
                                title="Delete"
                                className="absolute right-1 top-1 bg-surface"
                                onClick={() => void ask(scene)}
                            />
                        </div>
                    ))}
                </div>
            )}
        </PanelSection>
    );
}

export default SceneLibrary;
