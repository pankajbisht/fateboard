import { memo, useMemo } from 'react';
import { useStore } from '@store';
import { renderScene } from '@/scene/render/renderScene';
import { sceneSvg } from '@/scene/render/toSvg';
import { newScene } from '@/scene/schema/parse';
import { TIMES, type Season, type TimeOfDay, type Weather } from '@/scene/schema/types';
import { ENVIRONMENTS } from '@/scene/sets/registry';
import { Button } from '../../atoms/Button';
import { Select } from '../../atoms/Select';
import { SliderField } from '../../molecules/LabeledSlider';
import { PanelSection } from '../../molecules/PanelSection';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { options } from '../character/studioLabels';
import { SEASON_LABELS, TIME_LABELS, WEATHER_LABELS } from './sceneLabels';

/** Pictures of the empty places, made once per session: one <img> each, not thousands of live paths. */
const thumbs = new Map<string, string>();

function thumbOf(id: string): string {
    let url = thumbs.get(id);
    if (!url) {
        const s = newScene();
        const env = ENVIRONMENTS.get(id);
        s.set = { ...s.set, environment: id };
        s.camera = { ...s.camera, ...env.camera, position: [...env.camera.position] };
        url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sceneSvg(renderScene(s), 240))}`;
        thumbs.set(id, url);
    }
    return url;
}

const SetThumb = memo(function SetThumb({ id }: { id: string }) {
    const src = useMemo(() => thumbOf(id), [id]);
    return (
        <img src={src} alt="" width={240} height={135} className="block h-auto w-full rounded-sm" />
    );
});

/** Where the scene happens: the place and its look, the time of day, the weather and the season. */
export function SceneSetTab() {
    const set = useStore((s) => s.studioScene?.set);
    const edit = useStore((s) => s.editStudioScene);
    if (!set) return null;
    const env = ENVIRONMENTS.get(set.environment);
    const variant = env.variants.some((v) => v.id === set.variant)
        ? set.variant
        : env.variants[0].id;
    return (
        <div className="flex flex-col gap-4">
            <PanelSection title="Place" description="Every place works from every camera angle.">
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Places">
                    {ENVIRONMENTS.all.map((e) => (
                        <button
                            key={e.id}
                            type="button"
                            aria-pressed={e.id === set.environment}
                            onClick={() => edit({ kind: 'set', patch: { environment: e.id } })}
                            className="flex flex-col gap-1 rounded-md border border-line bg-surface p-1 text-left text-xs text-ink hover:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 aria-pressed:border-primary-600 aria-pressed:ring-1 aria-pressed:ring-primary-600"
                        >
                            <SetThumb id={e.id} />
                            <span className="px-0.5 font-medium">{e.name}</span>
                        </button>
                    ))}
                </div>
                {env.variants.length > 1 && (
                    <SegmentedControl<string>
                        aria-label={`${env.name} look`}
                        value={variant}
                        onChange={(v) => edit({ kind: 'set', patch: { variant: v } })}
                        options={env.variants.map((v) => ({ value: v.id, label: v.name }))}
                    />
                )}
                <Button
                    variant="secondary"
                    size="sm"
                    icon="shuffle"
                    onClick={() =>
                        edit({ kind: 'set', patch: { seed: Math.floor(Math.random() * 2 ** 31) } })
                    }
                >
                    Rearrange the place
                </Button>
            </PanelSection>
            <PanelSection
                title="Crowd"
                description="Simple people standing in the place behind your characters."
            >
                <SliderField
                    label="People in the background"
                    min={0}
                    max={80}
                    step={1}
                    value={set.crowd}
                    onChange={(crowd) => edit({ kind: 'set', patch: { crowd } }, 'crowd')}
                />
            </PanelSection>
            <PanelSection
                title="Light and weather"
                description="One light for the place and the characters."
            >
                <SegmentedControl<TimeOfDay>
                    aria-label="Time of day"
                    value={set.time}
                    onChange={(time) => edit({ kind: 'set', patch: { time } })}
                    options={TIMES.map((t) => ({ value: t, label: TIME_LABELS[t] }))}
                />
                <Select<Weather>
                    aria-label="Weather"
                    value={set.weather}
                    onChange={(weather) => edit({ kind: 'set', patch: { weather } })}
                    options={options(WEATHER_LABELS)}
                />
                <Select<Season>
                    aria-label="Season"
                    value={set.season}
                    onChange={(season) => edit({ kind: 'set', patch: { season } })}
                    options={options(SEASON_LABELS)}
                />
                <SliderField
                    label="Wind"
                    hint="Blows every actor's hair and hanging cloth the same way (each one's own wind, if stronger, stays)"
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    value={Math.round((set.wind ?? 0) * 100)}
                    onChange={(v) =>
                        edit({
                            kind: 'set',
                            patch: { wind: v / 100, windDir: set.windDir ?? 0 },
                        })
                    }
                />
                <SegmentedControl<string>
                    aria-label="Wind direction"
                    value={String(set.windDir ?? 0)}
                    onChange={(d) => edit({ kind: 'set', patch: { windDir: Number(d) } })}
                    options={[
                        { value: '0', label: '→ Right' },
                        { value: '180', label: '← Left' },
                        { value: '90', label: 'Toward' },
                        { value: '270', label: 'Away' },
                    ]}
                />
            </PanelSection>
        </div>
    );
}

export default SceneSetTab;
