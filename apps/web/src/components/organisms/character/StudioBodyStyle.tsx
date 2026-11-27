import { useStore } from '@store';
import { bodyStyleEdit } from '@/character/studio/edit';
import { MANGA_VARIANTS, type MangaVariant } from '@/character/schema/bodyStyles';
import { Select } from '../../atoms/Select';
import { Field } from '../../molecules/Field';
import { PanelSection } from '../../molecules/PanelSection';

const VARIANT_LABEL: Record<MangaVariant, string> = {
    shonen: 'Shonen: taller, broad, angular',
    shojo: 'Shojo: slim and soft',
    webtoon: 'Webtoon: long legs, clean lines',
    seinen: 'Seinen: grown man, broad, 8 heads',
    josei: 'Josei: grown woman, tall, realistic',
};

/**
 * Manga proportions (a head-unit table: 7.5–8 heads grown, legs longer than the torso) with its variant. It works with
 * every art style. Classic is not offered here; an old classic character becomes manga when you pick a variant.
 */
export function StudioBodyStyle() {
    const c = useStore((s) => s.studioCharacter);
    const edit = useStore((s) => s.editStudioCharacter);
    const body = c?.body;
    if (!c || !body) return null;

    return (
        <PanelSection
            title="Body style"
            description="Manga proportions (7.5–8 heads tall, long legs) work with every art style."
        >
            <Field wrap label="Manga variant">
                <Select<MangaVariant>
                    aria-label="Manga variant"
                    value={body.mangaVariant}
                    onChange={(mangaVariant) => {
                        const toManga = bodyStyleEdit(c, 'manga');
                        edit({ ...toManga, body: { ...toManga.body, mangaVariant } });
                    }}
                    options={MANGA_VARIANTS.map((value) => ({
                        value,
                        label: VARIANT_LABEL[value],
                    }))}
                />
            </Field>
        </PanelSection>
    );
}

export default StudioBodyStyle;
