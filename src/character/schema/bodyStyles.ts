/**
 * Body style (docs/CHARACTER_STUDIO.md, manga body): the proportions the skeleton is built with. It is separate from
 * the art style (`style`: cartoon, anime, manga …, how the lines and colours are drawn), so every art style can draw
 * either body. "classic" is the original doll body and is the default; old characters load as classic.
 */
export const BODY_STYLES = ['classic', 'manga'] as const;
export type BodyStyle = (typeof BODY_STYLES)[number];

/**
 * Manga sub-variants: shonen (taller, angular, broad), shojo (slim, soft), webtoon (long legs, clean), seinen (grown
 * men: 8 heads, broader, longer neck), josei (grown women: tall, realistic).
 */
export const MANGA_VARIANTS = ['shonen', 'shojo', 'webtoon', 'seinen', 'josei'] as const;
export type MangaVariant = (typeof MANGA_VARIANTS)[number];
