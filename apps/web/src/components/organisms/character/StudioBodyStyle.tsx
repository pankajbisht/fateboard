import { useMemo } from 'react';
import { useStore } from '@store';
import { bodyStyleEdit } from '@/character/studio/edit';
import {
    BODY_STYLES,
    MANGA_VARIANTS,
    type BodyStyle,
    type MangaVariant,
} from '@/character/schema/bodyStyles';
import { Select } from '../../atoms/Select';
import { Field } from '../../molecules/Field';
import { PanelSection } from '../../molecules/PanelSection';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { CharacterThumb } from './CharacterView';
import { BODY_STYLE_LABELS } from './studioLabels';

const VARIANT_LABEL: Record<MangaVariant, string> = {
    shonen: 'Shonen: taller, broad, angular',
    shojo: 'Shojo: slim and soft',
    webtoon: 'Webtoon: long legs, clean lines',
    seinen: 'Seinen: grown man, broad, 8 heads',
    josei: 'Josei: grown woman, tall, realistic',
};

/**
 * Classic or manga proportions (the manga table is in head units: 7.5–8 heads grown, legs longer than the torso).
 * It works with every art style. The two thumbnails show the same person both ways, side by side.
 */
export function StudioBodyStyle() {
    const c = useStore((s) => s.studioCharacter);
    const edit = useStore((s) => s.editStudioCharacter);
    const body = c?.body;
    const both = useMemo(
        () =>
            c && body
                ? BODY_STYLES.map((bodyStyle) => ({ ...c, body: { ...body, bodyStyle } }))
                : [],
        [c, body],
    );
    if (!c || !body) return null;

    return (
        <PanelSection
            title="Body style"
            description="Manga proportions (7.5–8 heads tall, long legs) work with every art style. Classic is the original body."
        >
            <SegmentedControl<BodyStyle>
                aria-label="Body style"
                value={body.bodyStyle}
                onChange={(bodyStyle) => edit(bodyStyleEdit(c, bodyStyle))}
                options={BODY_STYLES.map((value) => ({ value, label: BODY_STYLE_LABELS[value] }))}
            />
            {body.bodyStyle === 'manga' && (
                <Field wrap label="Manga variant">
                    <Select<MangaVariant>
                        aria-label="Manga variant"
                        value={body.mangaVariant}
                        onChange={(mangaVariant) => edit({ body: { mangaVariant } })}
                        options={MANGA_VARIANTS.map((value) => ({
                            value,
                            label: VARIANT_LABEL[value],
                        }))}
                    />
                </Field>
            )}
            <div
                className="grid grid-cols-2 gap-2"
                role="group"
                aria-label="Classic and manga side by side"
            >
                {both.map((m) => (
                    <figure key={m.body.bodyStyle} className="m-0 text-center">
                        <div className="h-40 rounded-md border border-line bg-surface">
                            <CharacterThumb character={m} />
                        </div>
                        <figcaption className="mt-1 text-xs text-ink-muted">
                            {BODY_STYLE_LABELS[m.body.bodyStyle]}
                        </figcaption>
                    </figure>
                ))}
            </div>
        </PanelSection>
    );
}

export default StudioBodyStyle;
