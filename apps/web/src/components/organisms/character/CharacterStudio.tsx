import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useStore } from '@store';
import { renderCharacter } from '@/character/render/renderCharacter';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { CharacterView } from './CharacterView';
import { StudioBodyTab } from './StudioBodyTab';
import { StudioCameraBar } from './StudioCameraBar';
import { StudioCastTab } from './StudioCastTab';
import { StudioFaceTab } from './StudioFaceTab';
import { StudioLookTab } from './StudioLookTab';
import { StudioWardrobeTab } from './StudioWardrobeTab';
import { StudioPartPanel } from './StudioPartPanel';
import { StudioPosesTab } from './StudioPosesTab';
import { StudioEffectsTab } from './StudioEffectsTab';
import { StudioTopBar } from './StudioTopBar';
import { STUDIO_ROOT, focusStudio } from './studioFocus';
import { SceneStage } from '../scene/SceneStage';
import { SceneTabs } from '../scene/SceneTabs';

type Tab = 'cast' | 'body' | 'look' | 'wardrobe' | 'face' | 'poses' | 'effects';
const TABS = [
    { value: 'cast', label: 'Cast' },
    { value: 'body', label: 'Body' },
    { value: 'look', label: 'Look' },
    { value: 'wardrobe', label: 'Wardrobe' },
    { value: 'face', label: 'Face' },
    { value: 'poses', label: 'Poses' },
    { value: 'effects', label: 'Effects' },
] as const;

/**
 * The Character Studio: a full-screen workspace over the editor (a modal dialog, so the board's shortcuts are
 * off while it is open). Tabs on the left, the character in the middle with the camera bar, the selected part
 * on the right. ⌘Z / ⌘⇧Z undo the studio's own changes; Esc closes it.
 */
export default function CharacterStudio() {
    const c = useStore((s) => s.studioCharacter);
    const camera = useStore((s) => s.studioCamera);
    const selected = useStore((s) => s.studioSelectedPart);
    const select = useStore((s) => s.selectStudioPart);
    const close = useStore((s) => s.closeCharacterStudio);
    const mode = useStore((s) => s.studioMode);
    const characterUndo = useStore((s) => s.studioUndo);
    const characterRedo = useStore((s) => s.studioRedo);
    const sceneUndo = useStore((s) => s.sceneUndo);
    const sceneRedo = useStore((s) => s.sceneRedo);
    const scene = mode === 'scene';
    const undo = scene ? sceneUndo : characterUndo;
    const redo = scene ? sceneRedo : characterRedo;
    const [tab, setTab] = useState<Tab>('body');
    const root = useRef<HTMLDivElement>(null);
    const model = useMemo(() => (c ? renderCharacter(c, camera) : null), [c, camera]);

    // focus moves in, and goes back to what opened the studio when it closes (the editor is inert meanwhile)
    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        root.current?.focus();
        return () => {
            if (opener?.isConnected) opener.focus();
        };
    }, []);

    const onKeyDown = (e: KeyboardEvent) => {
        // keys from another dialog (the colour picker, a confirm) are theirs, even though React bubbles them here
        const dialog = (e.target as HTMLElement).closest?.('[role="dialog"]');
        if (dialog && dialog !== root.current) return;
        const mod = e.metaKey || e.ctrlKey;
        const typing = (e.target as HTMLElement).closest?.(
            'input, textarea, [contenteditable="true"]',
        );
        if (e.key === 'Escape') {
            if ((e.target as HTMLElement).closest?.('[role="listbox"]')) return;
            close();
        } else if (mod && e.code === 'KeyZ' && !typing) (e.shiftKey ? redo : undo)();
        else if (mod && e.code === 'KeyY' && !typing) redo();
        else return;
        e.preventDefault();
        e.stopPropagation();
    };

    if (!c || !model) return null;
    return (
        <div
            ref={root}
            role="dialog"
            aria-modal="true"
            aria-label="Character Studio"
            tabIndex={-1}
            {...{ [STUDIO_ROOT]: '' }}
            onKeyDown={onKeyDown}
            onBlur={(e) => {
                if (!e.relatedTarget) focusStudio();
            }}
            className="fixed inset-0 z-50 flex flex-col bg-surface-muted outline-none"
        >
            <StudioTopBar />
            <div className="flex min-h-0 flex-1 max-md:flex-col">
                <aside
                    aria-label="Character settings"
                    className="flex w-80 shrink-0 flex-col border-r border-line bg-surface max-md:order-2 max-md:h-[45%] max-md:w-full max-md:border-r-0 max-md:border-t"
                >
                    {scene ? (
                        <SceneTabs />
                    ) : (
                        <>
                            <div className="shrink-0 p-2">
                                <SegmentedControl<Tab>
                                    aria-label="Studio tabs"
                                    value={tab}
                                    onChange={setTab}
                                    options={[...TABS]}
                                />
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                                {tab === 'cast' && <StudioCastTab />}
                                {tab === 'body' && <StudioBodyTab />}
                                {tab === 'look' && <StudioLookTab />}
                                {tab === 'wardrobe' && <StudioWardrobeTab />}
                                {tab === 'face' && <StudioFaceTab />}
                                {tab === 'poses' && <StudioPosesTab />}
                                {tab === 'effects' && <StudioEffectsTab />}
                            </div>
                        </>
                    )}
                </aside>
                <section
                    aria-label={scene ? 'Scene preview' : 'Character preview'}
                    className="flex min-h-0 min-w-0 flex-1 flex-col max-md:order-1"
                >
                    <div className="min-h-0 flex-1 p-4">
                        {scene ? (
                            <SceneStage />
                        ) : (
                            <CharacterView
                                model={model}
                                label={`${c.name}, ${c.rig.pose.name.toLowerCase()}`}
                                selected={selected}
                                onSelect={select}
                            />
                        )}
                    </div>
                    {!scene && <StudioCameraBar />}
                </section>
                {!scene && (
                    <aside
                        aria-label="Selected part"
                        className="w-64 shrink-0 overflow-y-auto border-l border-line bg-surface p-3 max-md:hidden"
                    >
                        <StudioPartPanel />
                    </aside>
                )}
            </div>
        </div>
    );
}
