import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import type { KeyName, Stance } from '@/character/combat/types';
import { EXCHANGES } from '@/scene/combat/exchanges';
import { Button } from '../../atoms/Button';
import { Select } from '../../atoms/Select';
import { PanelSection } from '../../molecules/PanelSection';

const STANCES: { value: Stance; label: string }[] = [
    { value: 'orthodox', label: 'Orthodox (left lead)' },
    { value: 'southpaw', label: 'Southpaw (right lead)' },
];
const MOMENTS: { value: KeyName; label: string }[] = [
    { value: 'start', label: 'Start' },
    { value: 'peak', label: 'Impact' },
    { value: 'recover', label: 'Recover' },
];

/**
 * Fight exchanges (docs/COMBAT_PACK.md, Stage 4): the selected character attacks someone, who answers (slip,
 * parry, check, sprawl, or takes the hit). Both are spaced, faced and the strike lands on its target for any
 * heights (one undo step).
 */
export function SceneFight() {
    const actors = useStore(useShallow((s) => s.studioScene?.actors ?? []));
    const selected = useStore((s) => s.sceneSelectedActor);
    const edit = useStore((s) => s.editStudioScene);
    const me = actors.find((a) => a.id === selected) ?? actors[0];
    const others = actors.filter((a) => a.id !== me?.id);
    const [opponentId, setOpponent] = useState<string>('');
    const [stanceA, setStanceA] = useState<Stance>('orthodox');
    const [stanceB, setStanceB] = useState<Stance>('orthodox');
    const [key, setKey] = useState<KeyName>('peak');
    const opponent = others.find((a) => a.id === opponentId) ?? others[0];
    useEffect(() => {
        if (opponent && opponent.id !== opponentId) setOpponent(opponent.id);
    }, [opponent, opponentId]);
    if (!me || !opponent) return null;
    return (
        <PanelSection
            title="Fight"
            description={`${me.character.name} attacks, the other answers: spaced and lined up so the strike lands, for any heights.`}
        >
            <Select<string>
                aria-label="Opponent"
                value={opponent.id}
                onChange={setOpponent}
                options={others.map((a) => ({ value: a.id, label: `Against ${a.character.name}` }))}
            />
            <div className="grid grid-cols-2 gap-1">
                <Select<Stance>
                    aria-label="Attacker stance"
                    value={stanceA}
                    onChange={setStanceA}
                    options={STANCES}
                />
                <Select<Stance>
                    aria-label="Defender stance"
                    value={stanceB}
                    onChange={setStanceB}
                    options={STANCES}
                />
            </div>
            <Select<KeyName> aria-label="Moment" value={key} onChange={setKey} options={MOMENTS} />
            <div className="grid grid-cols-2 gap-1" role="group" aria-label="Exchanges">
                {EXCHANGES.all.map((x) => (
                    <Button
                        key={x.id}
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                            edit({
                                kind: 'fight',
                                a: me.id,
                                b: opponent.id,
                                exchange: x.id,
                                stanceA,
                                stanceB,
                                key,
                            })
                        }
                    >
                        {x.name}
                    </Button>
                ))}
            </div>
        </PanelSection>
    );
}

export default SceneFight;
