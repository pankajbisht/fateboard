import { useEffect, useState } from 'react';
import { useStore } from '@store';
import { readCharacterData } from '@/character/board';
import { newId } from '@/character/schema/parse';
import { newScene } from '@/scene/schema/parse';
import { PanelAction } from '../../molecules/PanelAction';
import { PanelSection } from '../../molecules/PanelSection';
import { CastGrid, useRecipeCast } from './CastGrid';

type Placed = { kind: 'character' | 'scene'; name: string } | null;

/** A placed scene's name without loading the scene code (the panel stays light). */
function sceneName(obj: unknown): string | null {
    const scene = (obj as { sceneData?: { scene?: { name?: unknown } } } | null)?.sceneData?.scene;
    if (!scene) return null;
    return typeof scene.name === 'string' && scene.name.trim() ? scene.name : 'scene';
}

/** Is the selection a character or a scene from the studio? (follows selection changes) */
function useSelectedPlaced(): Placed {
    const canvas = useStore((s) => s.canvas);
    const [placed, setPlaced] = useState<Placed>(null);
    useEffect(() => {
        if (!canvas) return;
        const read = () => {
            const obj = canvas.getActiveObject();
            const scene = sceneName(obj);
            const character = readCharacterData(obj)?.character.name;
            setPlaced(
                scene
                    ? { kind: 'scene', name: scene }
                    : character
                      ? { kind: 'character', name: character }
                      : null,
            );
        };
        read();
        const events = ['selection:created', 'selection:updated', 'selection:cleared'] as const;
        const offs = events.map((e) => canvas.on(e, read));
        return () => offs.forEach((off) => off());
    }, [canvas]);
    return placed;
}

/**
 * Left rail "Characters": open the Character Studio, start from a cast member or a saved character, or edit
 * the selected character; start a scene or edit the selected one. The studio itself is a full-screen workspace
 * (CharacterStudio) with Character and Scene modes.
 */
export default function CharactersPanel() {
    const open = useStore((s) => s.openCharacterStudio);
    const openScene = useStore((s) => s.openSceneStudio);
    const library = useStore((s) => s.characterLibrary);
    const status = useStore((s) => s.characterLibraryStatus);
    const loadLibrary = useStore((s) => s.loadCharacterLibrary);
    const cast = useRecipeCast();
    const placed = useSelectedPlaced();
    const selected = placed?.kind === 'character' ? placed.name : null;

    useEffect(() => {
        if (status === 'idle') void loadLibrary();
    }, [status, loadLibrary]);

    return (
        <div className="flex flex-col gap-4">
            <PanelSection
                title="Character Studio"
                description="Make a character, pose it from any angle, then place it on the page."
            >
                {selected ? (
                    <PanelAction icon="character" onClick={() => void open()}>
                        Edit {selected}
                    </PanelAction>
                ) : (
                    <PanelAction icon="character" onClick={() => void open()}>
                        Open Character Studio
                    </PanelAction>
                )}
            </PanelSection>
            <PanelSection
                title="Scenes"
                description="Up to 5 characters in a place (12 to choose from), seen from any camera, in one frame."
            >
                {placed?.kind === 'scene' ? (
                    <PanelAction icon="image" onClick={() => void openScene()}>
                        Edit {placed.name}
                    </PanelAction>
                ) : (
                    <PanelAction icon="image" onClick={() => void openScene(newScene())}>
                        New scene
                    </PanelAction>
                )}
            </PanelSection>
            {library.length > 0 && (
                <PanelSection title="Your characters">
                    <CastGrid
                        cast={library}
                        columns={2}
                        onPick={(c) => void open(c)}
                        label={(c) => `Open ${c.name} in the studio`}
                    />
                </PanelSection>
            )}
            <PanelSection title="Cast" description="12 ready people to start from.">
                <CastGrid
                    cast={cast}
                    columns={2}
                    onPick={(c) => void open({ ...c, id: newId() })}
                    label={(c) => `Open ${c.name} in the studio`}
                />
            </PanelSection>
        </div>
    );
}
