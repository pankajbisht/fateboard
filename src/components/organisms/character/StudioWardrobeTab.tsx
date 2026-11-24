import { useStore } from '@store';
import { resolveDress, takeOff, wear } from '@/character/data/dressRules';
import { OUTFITS, OUTFIT_GROUPS, type Outfit } from '@/character/data/outfits';
import { ACCESSORY_DEFS, ACCESSORY_IDS, SHOE_DEFS, SHOE_IDS } from '@/character/data/wardrobe';
import { suited } from '@/character/data/garments';
import { Select } from '../../atoms/Select';
import { Field } from '../../molecules/Field';
import LabeledToggle from '../../molecules/LabeledToggle';
import { PanelSection } from '../../molecules/PanelSection';
import { ColorChoices } from './ColorChoices';
import { StudioHeldItems } from './StudioHeldItems';

const COLORS = [
    '#ef4444',
    '#f59e0b',
    '#16a34a',
    '#0ea5e9',
    '#2563eb',
    '#7c3aed',
    '#db2777',
    '#111827',
    '#f8fafc',
    '#78350f',
];

/** Outfit presets, shoes and accessories. Rules (`dressRules.ts`) keep a look consistent: a hood under a scarf is refused. */
export function StudioWardrobeTab() {
    const c = useStore((s) => s.studioCharacter);
    const edit = useStore((s) => s.editStudioCharacter);
    if (!c) return null;
    const female = c.body.gender >= 0.5;
    const worn = new Map(c.dress.accessories.map((a) => [a.kind, a]));
    const wearOutfit = (o: Outfit) =>
        edit({
            top: o.dress.top,
            bottom: o.dress.bottom,
            shoes: o.dress.shoes,
            accessories: o.dress.accessories,
        });

    return (
        <>
            <PanelSection
                title="Outfits"
                description="A whole look in one click. Colours can be changed after."
            >
                {(Object.keys(OUTFIT_GROUPS) as (keyof typeof OUTFIT_GROUPS)[]).map((g) => (
                    <Field wrap key={g} label={OUTFIT_GROUPS[g]}>
                        <Select
                            aria-label={`${OUTFIT_GROUPS[g]} outfit`}
                            value=""
                            onChange={(id) => {
                                const o = OUTFITS.find((x) => x.id === id);
                                if (o) wearOutfit(o);
                            }}
                            options={[
                                { value: '', label: 'Choose…' },
                                ...OUTFITS.filter(
                                    (o) => o.group === g && suited(o.suits, female),
                                ).map((o) => ({ value: o.id, label: o.name })),
                            ]}
                        />
                    </Field>
                ))}
            </PanelSection>

            <PanelSection title="Shoes">
                <Field wrap label="Shoes">
                    <Select
                        aria-label="Shoes"
                        value={c.dress.shoes.kind}
                        onChange={(kind) => edit({ shoes: { kind } })}
                        options={SHOE_IDS.filter((k) => suited(SHOE_DEFS[k].suits, female)).map(
                            (k) => ({ value: k, label: SHOE_DEFS[k].name }),
                        )}
                    />
                </Field>
                <ColorChoices
                    id="wardrobe-shoes"
                    label="Shoe colour"
                    colors={COLORS}
                    value={c.dress.shoes.color}
                    onChange={(color) => edit({ shoes: { color } }, 'shoe-color')}
                />
            </PanelSection>

            <PanelSection
                title="Accessories"
                description="One per place (a cap or a beanie, not both). Some do not go together; the studio says why."
            >
                {ACCESSORY_IDS.filter((k) => suited(ACCESSORY_DEFS[k].suits, female)).map((k) => {
                    const a = worn.get(k);
                    const why = a
                        ? []
                        : resolveDress({ ...c.dress, accessories: [{ kind: k, color: '#000' }] })
                              .removed;
                    return (
                        <div key={k}>
                            <LabeledToggle
                                label={ACCESSORY_DEFS[k].name}
                                checked={!!a}
                                hint={why[0]?.reason}
                                disabled={why.length > 0}
                                onChange={(on) =>
                                    edit({
                                        accessories: (on ? wear(c.dress, k) : takeOff(c.dress, k))
                                            .accessories,
                                    })
                                }
                            />
                            {a && (
                                <ColorChoices
                                    label={`${ACCESSORY_DEFS[k].name} colour`}
                                    colors={COLORS}
                                    value={a.color}
                                    onChange={(color) =>
                                        edit(
                                            {
                                                accessories: c.dress.accessories.map((x) =>
                                                    x.kind === k ? { ...x, color } : x,
                                                ),
                                            },
                                            `acc-${k}`,
                                        )
                                    }
                                />
                            )}
                        </div>
                    );
                })}
            </PanelSection>

            <StudioHeldItems />
        </>
    );
}

export default StudioWardrobeTab;
