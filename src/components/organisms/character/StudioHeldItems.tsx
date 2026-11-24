import { useStore } from '@store';
import { PROP_DEFS, normalizeHeld } from '@/character/data/props';
import { PROP_KINDS, type PropKind } from '@/character/schema/propKinds';
import { Select } from '../../atoms/Select';
import { Field } from '../../molecules/Field';
import { PanelSection } from '../../molecules/PanelSection';

const ONE = PROP_KINDS.filter((k) => PROP_DEFS[k].hands === 'one');
const TWO = PROP_KINDS.filter((k) => PROP_DEFS[k].hands === 'two');
const NONE = '';

/** What the hands hold: an item per hand, or an item that takes both (rifle, boxing gloves). */
export function StudioHeldItems() {
    const c = useStore((s) => s.studioCharacter);
    const edit = useStore((s) => s.editStudioCharacter);
    if (!c) return null;
    const held = c.dress.held;
    const two = held.find((h) => h.hand === 'both')?.kind ?? NONE;
    const inHand = (side: 'L' | 'R') => held.find((h) => h.hand === side)?.kind ?? NONE;

    const setHand = (side: 'L' | 'R', kind: string) => {
        const rest = held.filter((h) => h.hand !== side && h.hand !== 'both');
        edit({
            held: normalizeHeld(
                kind === NONE ? rest : [...rest, { kind: kind as PropKind, hand: side }],
            ),
        });
    };
    const setBoth = (kind: string) =>
        edit({ held: kind === NONE ? [] : [{ kind: kind as PropKind, hand: 'both' }] });
    const opts = (kinds: readonly PropKind[]) => [
        { value: NONE, label: 'Nothing' },
        ...kinds.map((k) => ({ value: k as string, label: PROP_DEFS[k].name })),
    ];

    return (
        <PanelSection
            title="In the hands"
            description="Swords, a staff, a torch, a rifle or boxing gloves follow the arms in every pose. Pick a fight or sword pose to use them."
        >
            <Field wrap label="Right hand">
                <Select
                    aria-label="Right hand holds"
                    value={inHand('R')}
                    onChange={(k) => setHand('R', k)}
                    options={opts(ONE)}
                />
            </Field>
            <Field wrap label="Left hand">
                <Select
                    aria-label="Left hand holds"
                    value={inHand('L')}
                    onChange={(k) => setHand('L', k)}
                    options={opts(ONE)}
                />
            </Field>
            <Field wrap label="Both hands">
                <Select
                    aria-label="Both hands hold"
                    value={two}
                    onChange={setBoth}
                    options={opts(TWO)}
                />
            </Field>
        </PanelSection>
    );
}

export default StudioHeldItems;
