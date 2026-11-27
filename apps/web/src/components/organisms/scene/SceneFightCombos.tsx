import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import type { Stance } from '@/character/combat/types';
import { COMBO_PRESETS, type ComboStep, type FightCombo } from '@/scene/combat/choreo';
import { EXCHANGES } from '@/scene/combat/exchanges';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { PanelSection } from '../../molecules/PanelSection';

const BY: { value: ComboStep['by']; label: string }[] = [
    { value: 'a', label: 'First fighter attacks' },
    { value: 'b', label: 'Second fighter attacks' },
];
const STANCES: { value: Stance; label: string }[] = [
    { value: 'orthodox', label: 'Orthodox' },
    { value: 'southpaw', label: 'Southpaw' },
];
const nameOf = (id: string) => EXCHANGES.all.find((x) => x.id === id)?.name ?? id;

/**
 * Fight combos (docs/COMBAT_PACK.md, Stage 4): pick a preset or a saved combo and play it on the page as a clip
 * (the studio closes, the timeline opens under the board and plays it), or build your own sequence of exchanges
 * and save it for later.
 */
export function SceneFightCombos() {
    const actors = useStore(useShallow((s) => s.studioScene?.actors ?? []));
    const saved = useStore((s) => s.fightCombos);
    const status = useStore((s) => s.fightComboStatus);
    const a = useStore(
        useShallow((s) => ({
            load: s.loadFightCombos,
            save: s.saveFightCombo,
            remove: s.deleteFightCombo,
            place: s.placeFightClip,
            confirm: s.confirmDialog,
            closeStudio: s.closeCharacterStudio,
            openTimeline: s.setTimelineOpen,
            playTimeline: s.play,
        })),
    );
    const [pick, setPick] = useState<string>(COMBO_PRESETS.all[0].id);
    const [steps, setSteps] = useState<ComboStep[]>([]);
    const [by, setBy] = useState<ComboStep['by']>('a');
    const [exchange, setExchange] = useState<string>(EXCHANGES.all[0].id);
    const [name, setName] = useState('');
    const [stanceA, setStanceA] = useState<Stance>('orthodox');
    const [stanceB, setStanceB] = useState<Stance>('orthodox');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (status === 'idle') void a.load();
    }, [status, a]);
    if (actors.length < 2) return null;
    const mine = saved.find((c) => c.id === pick);
    const options = [
        ...COMBO_PRESETS.all.map((c) => ({ value: c.id, label: c.name })),
        ...saved.map((c) => ({ value: c.id, label: `${c.name} (yours)` })),
    ];
    const play = async () => {
        setBusy(true);
        try {
            // placed: the studio closes and the clip plays on the timeline under the board
            if (!(await a.place(pick))) return;
            a.closeStudio();
            a.openTimeline(true);
            a.playTimeline();
        } finally {
            setBusy(false);
        }
    };
    const saveNew = async () => {
        const combo: FightCombo = {
            id: `combo-${Date.now().toString(36)}`,
            name: name.trim() || 'My combo',
            tags: [],
            stanceA,
            stanceB,
            steps,
        };
        if (await a.save(combo)) {
            setSteps([]);
            setName('');
            setPick(combo.id);
        }
    };
    const removeMine = async () => {
        if (!mine) return;
        const ok = await a.confirm({
            title: `Delete "${mine.name}"?`,
            message: 'The combo is removed from your saved combos.',
            confirmLabel: 'Delete',
            tone: 'danger',
        });
        if (ok && (await a.remove(mine.id))) setPick(COMBO_PRESETS.all[0].id);
    };
    return (
        <PanelSection
            title="Fight combos"
            description="A sequence of exchanges, played on the page as a clip on the timeline."
        >
            <Select<string> aria-label="Combo" value={pick} onChange={setPick} options={options} />
            <div className="grid grid-cols-2 gap-1">
                <Button variant="primary" size="sm" disabled={busy} onClick={() => void play()}>
                    {busy ? 'Drawing…' : 'Play on page'}
                </Button>
                {mine && (
                    <Button variant="secondary" size="sm" onClick={() => void removeMine()}>
                        Delete combo
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-2 gap-1">
                <Select<Stance>
                    aria-label="First fighter stance"
                    value={stanceA}
                    onChange={setStanceA}
                    options={STANCES}
                />
                <Select<Stance>
                    aria-label="Second fighter stance"
                    value={stanceB}
                    onChange={setStanceB}
                    options={STANCES}
                />
            </div>
            <Select<ComboStep['by']>
                aria-label="Who attacks"
                value={by}
                onChange={setBy}
                options={BY}
            />
            <Select<string>
                aria-label="Exchange to add"
                value={exchange}
                onChange={setExchange}
                options={EXCHANGES.all.map((x) => ({ value: x.id, label: x.name }))}
            />
            <Button
                variant="secondary"
                size="sm"
                onClick={() => setSteps([...steps, { by, exchange }])}
            >
                Add step
            </Button>
            {steps.length > 0 && (
                <ol className="list-decimal pl-5 text-sm text-ink" aria-label="Your combo">
                    {steps.map((s, i) => (
                        <li key={i} className="flex items-center justify-between gap-1">
                            <span>
                                {s.by === 'a' ? 'First' : 'Second'}: {nameOf(s.exchange)}
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                aria-label={`Remove step ${i + 1}`}
                                onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                            >
                                Remove
                            </Button>
                        </li>
                    ))}
                </ol>
            )}
            <Input
                size="sm"
                aria-label="Combo name"
                placeholder="Name your combo"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <Button
                variant="secondary"
                size="sm"
                disabled={!steps.length}
                onClick={() => void saveNew()}
            >
                Save combo
            </Button>
        </PanelSection>
    );
}

export default SceneFightCombos;
