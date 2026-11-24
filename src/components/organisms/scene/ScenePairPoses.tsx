import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { buildSkeleton } from '@/character/rig/skeleton';
import { PAIR_POSES, pairSuits } from '@/scene/layout/pairPoseDefs';
import { Button } from '../../atoms/Button';
import { Select } from '../../atoms/Select';
import { PanelSection } from '../../molecules/PanelSection';

/**
 * Two characters in contact (hug, handshake, arm around the shoulder …): pick who is with the selected character,
 * then a pose. Both are placed and their hands put on each other, whatever their heights (one undo step).
 */
export function ScenePairPoses() {
    const actors = useStore(useShallow((s) => s.studioScene?.actors ?? []));
    const selected = useStore((s) => s.sceneSelectedActor);
    const edit = useStore((s) => s.editStudioScene);
    const me = actors.find((a) => a.id === selected) ?? actors[0];
    const others = actors.filter((a) => a.id !== me?.id);
    const [partnerId, setPartner] = useState<string>('');
    const partner = others.find((a) => a.id === partnerId) ?? others[0];
    useEffect(() => {
        if (partner && partner.id !== partnerId) setPartner(partner.id);
    }, [partner, partnerId]);
    const skels = useMemo(
        () =>
            me && partner
                ? [buildSkeleton(me.character.body), buildSkeleton(partner.character.body)]
                : null,
        [me, partner],
    );
    if (!me || !partner || !skels) return null;
    return (
        <PanelSection
            title="Together"
            description={`${me.character.name} with someone: both are placed and their hands meet, for any heights.`}
        >
            <Select<string>
                aria-label="With"
                value={partner.id}
                onChange={setPartner}
                options={others.map((a) => ({ value: a.id, label: `With ${a.character.name}` }))}
            />
            <div className="grid grid-cols-2 gap-1" role="group" aria-label="Pair poses">
                {PAIR_POSES.map((p) => {
                    const ok = pairSuits(p, skels[0], skels[1]);
                    return (
                        <Button
                            key={p.id}
                            variant="secondary"
                            size="sm"
                            disabled={!ok}
                            title={ok ? undefined : 'Needs people of similar height'}
                            onClick={() =>
                                edit({ kind: 'pairPose', a: me.id, b: partner.id, pair: p.id })
                            }
                        >
                            {p.name}
                        </Button>
                    );
                })}
            </div>
        </PanelSection>
    );
}

export default ScenePairPoses;
