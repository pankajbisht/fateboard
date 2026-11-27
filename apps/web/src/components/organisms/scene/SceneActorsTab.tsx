import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { FORMATIONS } from '@/scene/layout/formations';
import { BODY_STYLES, type BodyStyle } from '@/character/schema/bodyStyles';
import { applyEdit, bodyStyleEdit } from '@/character/studio/edit';
import { MAX_ACTORS } from '@/scene/schema/types';
import { Button } from '../../atoms/Button';
import { Select } from '../../atoms/Select';
import LabeledToggle from '../../molecules/LabeledToggle';
import { SliderField } from '../../molecules/LabeledSlider';
import { PanelSection } from '../../molecules/PanelSection';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { BODY_STYLE_LABELS } from '../character/studioLabels';
import { CharacterThumb } from '../character/CharacterView';
import { SceneFight } from './SceneFight';
import { SceneFightCombos } from './SceneFightCombos';
import { SceneFightFx } from './SceneFightFx';
import { ScenePairPoses } from './ScenePairPoses';

/** Who is in the scene: pick, add, edit, remove; where the selected one faces and looks; group layouts. */
export function SceneActorsTab() {
    const actors = useStore(useShallow((s) => s.studioScene?.actors ?? []));
    const selected = useStore((s) => s.sceneSelectedActor);
    const a = useStore(
        useShallow((s) => ({
            select: s.selectSceneActor,
            add: s.addSceneActor,
            edit: s.editStudioScene,
            mode: s.setStudioMode,
        })),
    );
    const lock = useStore((s) => s.studioScene?.styleLock ?? false);
    const actor = actors.find((x) => x.id === selected);
    const ids = actors.map((x) => x.id);
    return (
        <div className="flex flex-col gap-4">
            <PanelSection title="Characters" description={`Up to ${MAX_ACTORS} in a scene.`}>
                <ul className="flex flex-col gap-1" aria-label="Characters in the scene">
                    {actors.map((x) => (
                        <li key={x.id}>
                            <button
                                type="button"
                                aria-pressed={x.id === selected}
                                onClick={() => a.select(x.id)}
                                className="flex w-full items-center gap-2 rounded-md border border-line bg-surface px-2 py-1 text-left text-sm text-ink hover:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 aria-pressed:border-primary-600 aria-pressed:bg-primary-50"
                            >
                                <span className="h-10 w-8 shrink-0">
                                    <CharacterThumb character={x.character} />
                                </span>
                                <span className="truncate">{x.character.name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        icon="plus"
                        disabled={actors.length >= MAX_ACTORS}
                        onClick={() => a.add()}
                    >
                        Add character
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="character"
                        disabled={!actor}
                        onClick={() => a.mode('character')}
                    >
                        Edit character
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="trash"
                        disabled={!actor}
                        onClick={() => actor && a.edit({ kind: 'removeActor', id: actor.id })}
                    >
                        Remove
                    </Button>
                </div>
            </PanelSection>
            <LabeledToggle
                label="Same style for everyone"
                hint="New and edited characters follow the scene’s art style"
                checked={lock}
                onChange={(on) => a.edit({ kind: 'styleLock', on })}
            />
            {actor && (
                <PanelSection title={actor.character.name}>
                    <SegmentedControl<BodyStyle>
                        aria-label="Body style"
                        value={actor.character.body.bodyStyle}
                        onChange={(bodyStyle) =>
                            a.edit({
                                kind: 'actorCharacter',
                                id: actor.id,
                                character: applyEdit(
                                    actor.character,
                                    bodyStyleEdit(actor.character, bodyStyle),
                                ),
                            })
                        }
                        options={BODY_STYLES.map((value) => ({
                            value,
                            label: BODY_STYLE_LABELS[value],
                        }))}
                    />
                    <SliderField
                        label="Facing"
                        min={0}
                        max={359}
                        step={1}
                        unit="°"
                        value={Math.round(actor.facing)}
                        onChange={(facing) =>
                            a.edit({ kind: 'turnActor', id: actor.id, facing }, `face-${actor.id}`)
                        }
                    />
                    <Select<string>
                        aria-label="Looks at"
                        value={actor.lookAt ?? ''}
                        onChange={(target) =>
                            a.edit({ kind: 'lookAt', id: actor.id, target: target || null })
                        }
                        options={[
                            { value: '', label: 'Looks ahead' },
                            ...actors
                                .filter((x) => x.id !== actor.id)
                                .map((x) => ({
                                    value: x.id,
                                    label: `Looks at ${x.character.name}`,
                                })),
                        ]}
                    />
                </PanelSection>
            )}
            {actors.length > 1 && <ScenePairPoses />}
            {actors.length > 1 && <SceneFight />}
            {actors.length > 1 && <SceneFightFx />}
            {actors.length > 1 && <SceneFightCombos />}
            {actors.length > 1 && (
                <PanelSection
                    title="Group"
                    description="Arrange everyone at once; tallest to the back where rows need it."
                >
                    <div className="grid grid-cols-2 gap-1" role="group" aria-label="Formations">
                        {FORMATIONS.all.map((f) => (
                            <Button
                                key={f.id}
                                variant="secondary"
                                size="sm"
                                onClick={() => a.edit({ kind: 'formation', formation: f.id })}
                            >
                                {f.name}
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1" role="group" aria-label="Line up">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => a.edit({ kind: 'align', ids, how: 'front' })}
                        >
                            Same row
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={actors.length < 3}
                            onClick={() => a.edit({ kind: 'distribute', ids })}
                        >
                            Even gaps
                        </Button>
                    </div>
                </PanelSection>
            )}
        </div>
    );
}

export default SceneActorsTab;
