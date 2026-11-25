import { useStore } from '@store';
import { HAIR_COLORS } from '@/character/data/recipes';
import { BOTTOM_DEFS, BOTTOM_IDS, TOP_DEFS, TOP_IDS } from '@/character/data/garments';
import { HAIR_DEFS, hasTips } from '@/character/data/hairStyles';
import { HAIR_STYLES, type HairStyle } from '@/character/schema/types';
import { Select } from '../../atoms/Select';
import LabeledToggle from '../../molecules/LabeledToggle';
import { Field } from '../../molecules/Field';
import { PanelSection } from '../../molecules/PanelSection';
import { ColorChoices } from './ColorChoices';
import { BROW_LABELS, EYE_LABELS, MOUTH_LABELS, NOSE_LABELS, options } from './studioLabels';

const CLOTH = [
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
const EYES = ['#2b1d14', '#4a2e1b', '#1d4ed8', '#15803d', '#57534e', '#7c3aed'];

/** Hair, face and clothes. Every change is one undo step (colour drags are one). */
export function StudioLookTab() {
    const c = useStore((s) => s.studioCharacter);
    const edit = useStore((s) => s.editStudioCharacter);
    if (!c) return null;

    return (
        <>
            <PanelSection title="Hair">
                <Select<HairStyle>
                    aria-label="Hair style"
                    value={c.hair.style}
                    onChange={(style) => edit({ hair: { style } })}
                    options={HAIR_STYLES.map((id) => ({
                        value: id,
                        label: `${HAIR_DEFS[id].group}: ${HAIR_DEFS[id].name}`,
                    }))}
                />
                <ColorChoices
                    id="character-hair"
                    label="Hair colour"
                    colors={HAIR_COLORS}
                    value={c.hair.color}
                    onChange={(color) => edit({ hair: { color } }, 'hair-color')}
                />
                <LabeledToggle
                    label="Two-tone hair"
                    hint="A different colour on the tips: long hair, tails, braids and locks"
                    checked={c.hair.tip !== null}
                    disabled={!hasTips(c.hair.style)}
                    onChange={(on) =>
                        edit({ hair: { tip: on ? (c.hair.tip ?? '#3a4fb8') : null } })
                    }
                />
                <LabeledToggle
                    label="Ahoge"
                    hint="One strand standing up from the top of the head; a hat hides it"
                    checked={c.hair.ahoge}
                    disabled={c.hair.style === 'bald'}
                    onChange={(ahoge) => edit({ hair: { ahoge } })}
                />
                {c.hair.tip !== null && hasTips(c.hair.style) && (
                    <ColorChoices
                        label="Tip colour"
                        colors={HAIR_COLORS}
                        value={c.hair.tip}
                        onChange={(tip) => edit({ hair: { tip } }, 'hair-tip')}
                    />
                )}
            </PanelSection>

            <PanelSection title="Face">
                <div className="grid grid-cols-2 gap-2">
                    <Field wrap label="Eyes">
                        <Select
                            aria-label="Eyes"
                            value={c.face.eyeStyle}
                            onChange={(eyeStyle) => edit({ face: { eyeStyle } })}
                            options={options(EYE_LABELS)}
                        />
                    </Field>
                    <Field wrap label="Brows">
                        <Select
                            aria-label="Brows"
                            value={c.face.browStyle}
                            onChange={(browStyle) => edit({ face: { browStyle } })}
                            options={options(BROW_LABELS)}
                        />
                    </Field>
                    <Field wrap label="Nose">
                        <Select
                            aria-label="Nose"
                            value={c.face.noseStyle}
                            onChange={(noseStyle) => edit({ face: { noseStyle } })}
                            options={options(NOSE_LABELS)}
                        />
                    </Field>
                    <Field wrap label="Mouth">
                        <Select
                            aria-label="Mouth"
                            value={c.face.mouthStyle}
                            onChange={(mouthStyle) => edit({ face: { mouthStyle } })}
                            options={options(MOUTH_LABELS)}
                        />
                    </Field>
                </div>
                <LabeledToggle
                    label="Eyelashes"
                    hint="A heavy upper lash line with flicks at the outer corners"
                    checked={c.face.lashes}
                    onChange={(lashes) => edit({ face: { lashes } })}
                />
                <ColorChoices
                    id="character-eyes"
                    label="Eye colour"
                    colors={EYES}
                    value={c.face.eyeColor}
                    onChange={(eyeColor) => edit({ face: { eyeColor } }, 'eye-color')}
                />
            </PanelSection>

            <PanelSection
                title="Clothes"
                description="47 tops and 38 bottoms. Shoes, accessories and outfits are in Wardrobe."
            >
                <Field wrap label="Top">
                    <Select
                        aria-label="Top"
                        value={c.dress.top.kind}
                        onChange={(kind) => edit({ top: { kind } })}
                        options={TOP_IDS.map((id) => ({ value: id, label: TOP_DEFS[id].name }))}
                    />
                </Field>
                <ColorChoices
                    id="character-top"
                    label="Top colour"
                    colors={CLOTH}
                    value={c.dress.top.color}
                    onChange={(color) => edit({ top: { color } }, 'top-color')}
                />
                <Field wrap label="Bottom">
                    <Select
                        aria-label="Bottom"
                        value={c.dress.bottom.kind}
                        onChange={(kind) => edit({ bottom: { kind } })}
                        options={BOTTOM_IDS.map((id) => ({
                            value: id,
                            label: BOTTOM_DEFS[id].name,
                        }))}
                    />
                </Field>
                <ColorChoices
                    id="character-bottom"
                    label="Bottom colour"
                    colors={CLOTH}
                    value={c.dress.bottom.color}
                    onChange={(color) => edit({ bottom: { color } }, 'bottom-color')}
                />
                <ColorChoices
                    id="character-shoes"
                    label="Shoe colour"
                    colors={CLOTH}
                    value={c.dress.shoes.color}
                    onChange={(color) => edit({ shoes: { color } }, 'shoe-color')}
                />
            </PanelSection>
        </>
    );
}

export default StudioLookTab;
