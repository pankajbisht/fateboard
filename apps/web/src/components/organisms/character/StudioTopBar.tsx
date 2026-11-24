import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { shortcut } from '@/lib/utils/isMac';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { IconButton } from '../../atoms/IconButton';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { AVAILABLE_STYLES, STYLE_PACKS } from '@/character/render/styles';
import type { StyleId } from '@/character/schema/types';
import type { StudioMode } from '@/store/slices/createSceneSlice';
import { SegmentedControl } from '../../molecules/SegmentedControl';

/**
 * Character / Scene mode, the name, undo / redo (of the mode's own history), the art style (every actor in Scene
 * mode), Surprise me and Save to my characters (Character mode), Save to my scenes (Scene mode), place on (or update)
 * the page, close.
 */
export function StudioTopBar() {
    const s = useStore(
        useShallow((st) => ({
            mode: st.studioMode,
            name:
                (st.studioMode === 'scene' ? st.studioScene?.name : st.studioCharacter?.name) ?? '',
            style:
                (st.studioMode === 'scene'
                    ? st.studioScene?.actors[0]?.character.style
                    : st.studioCharacter?.style) ?? 'cartoon',
            canUndo: (st.studioMode === 'scene' ? st.scenePast : st.studioPast).length > 0,
            canRedo: (st.studioMode === 'scene' ? st.sceneFuture : st.studioFuture).length > 0,
            placed: st.studioMode === 'scene' ? st.sceneEditingPlaced : st.studioEditingPlaced,
            hasCanvas: !!st.canvas,
        })),
    );
    const a = useStore(
        useShallow((st) => ({
            edit: st.editStudioCharacter,
            editScene: st.editStudioScene,
            setMode: st.setStudioMode,
            undo: st.studioUndo,
            redo: st.studioRedo,
            sceneUndo: st.sceneUndo,
            sceneRedo: st.sceneRedo,
            placeScene: st.placeStudioScene,
            saveScene: st.saveStudioScene,
            surprise: st.surpriseStudioCharacter,
            save: st.saveStudioToLibrary,
            place: st.placeStudioCharacter,
            close: st.closeCharacterStudio,
        })),
    );

    const scene = s.mode === 'scene';
    const placeAndClose = async () => {
        if (await (scene ? a.placeScene() : a.place())) a.close();
    };
    const what = scene ? 'scene' : 'character';

    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
            <Icon name="character" className="text-primary-ink" />
            <h2 className="text-sm font-semibold text-ink max-sm:sr-only">Character Studio</h2>
            <SegmentedControl<StudioMode>
                aria-label="Studio mode"
                size="sm"
                block={false}
                className="shrink-0"
                value={s.mode}
                onChange={a.setMode}
                options={[
                    { value: 'character', label: 'Character' },
                    { value: 'scene', label: 'Scene' },
                ]}
            />
            <div className="w-44 shrink-0 max-sm:flex-1">
                <Input
                    size="sm"
                    aria-label={scene ? 'Scene name' : 'Character name'}
                    value={s.name}
                    onChange={(e) =>
                        scene
                            ? a.editScene({ kind: 'rename', name: e.target.value }, 'scene-name')
                            : a.edit({ name: e.target.value }, 'name')
                    }
                />
            </div>
            <IconButton
                icon={<Icon name="undo" />}
                aria-label={`Undo ${what} change`}
                title={`Undo (${shortcut('⌘Z', 'Ctrl+Z')})`}
                disabled={!s.canUndo}
                onClick={scene ? a.sceneUndo : a.undo}
            />
            <IconButton
                icon={<Icon name="redo" />}
                aria-label={`Redo ${what} change`}
                title={`Redo (${shortcut('⌘⇧Z', 'Ctrl+Shift+Z')})`}
                disabled={!s.canRedo}
                onClick={scene ? a.sceneRedo : a.redo}
            />
            <Select<StyleId>
                aria-label="Art style"
                size="sm"
                block={false}
                value={s.style}
                onChange={(style) =>
                    scene ? a.editScene({ kind: 'style', style }) : a.edit({ style })
                }
                options={AVAILABLE_STYLES.map((id) => ({ value: id, label: STYLE_PACKS[id].name }))}
            />
            {!scene && (
                <>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="shuffle"
                        onClick={() => void a.surprise()}
                    >
                        Surprise me
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="floppy-disk"
                        onClick={() => void a.save()}
                    >
                        Save to my characters
                    </Button>
                </>
            )}
            {scene && (
                <Button
                    variant="secondary"
                    size="sm"
                    icon="floppy-disk"
                    onClick={() => void a.saveScene()}
                >
                    Save to my scenes
                </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
                <Button
                    size="sm"
                    icon="plus"
                    disabled={!s.hasCanvas}
                    onClick={() => void placeAndClose()}
                >
                    {scene
                        ? s.placed
                            ? 'Update scene on page'
                            : 'Place scene on page'
                        : s.placed
                          ? 'Update on page'
                          : 'Place on page'}
                </Button>
                <IconButton
                    icon={<Icon name="xmark" />}
                    aria-label="Close Character Studio"
                    title="Close (Esc)"
                    onClick={a.close}
                />
            </div>
        </div>
    );
}

export default StudioTopBar;
