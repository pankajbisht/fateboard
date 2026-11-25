/** After the steps: takeaways, the palette (click to copy), "Make it yours" and the neighbouring pieces. */
import clsx from 'clsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/atoms/Icon';
import { FOCUS_RING } from '@/components/atoms/control.styles';
import { RichText } from '@/components/organisms/helpsection/ui/RichText';

import {
    galleryImage,
    galleryPath,
    GALLERY_ITEMS,
    type GalleryItem,
} from '../web/gallery/galleryData';

const CARD = 'rounded-2xl border border-line bg-surface p-5';
const H2 = 'text-xl font-bold text-ink';

export function Tricks({ tricks }: { tricks: string[] }) {
    return (
        <section aria-labelledby="tricks-title" className={CARD}>
            <h2 id="tricks-title" className={H2}>
                Tricks worth stealing
            </h2>
            <ul className="mt-3 space-y-2">
                {tricks.map((trick) => (
                    <li key={trick} className="flex gap-2 leading-7 text-ink-muted">
                        <Icon name="check" className="mt-1.5 shrink-0 text-primary-ink" />
                        <span>
                            <RichText text={trick} />
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export function Palette({ colours }: { colours: string[] }) {
    const [copied, setCopied] = useState<string | null>(null);
    const copy = async (colour: string) => {
        try {
            await navigator.clipboard.writeText(colour);
            setCopied(colour);
        } catch (error) {
            console.error('[gallery] copy failed', error);
        }
    };
    if (!colours.length) return null;
    return (
        <section aria-labelledby="palette-title" className={CARD}>
            <h2 id="palette-title" className={H2}>
                Palette
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
                The colours this piece uses most. Click one to copy its hex, then paste it into the
                custom colour picker.
            </p>
            <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
                {colours.map((colour) => (
                    <li key={colour}>
                        <button
                            type="button"
                            onClick={() => void copy(colour)}
                            aria-label={`Copy ${colour}`}
                            className={clsx('group w-full text-left', FOCUS_RING, 'rounded-lg')}
                        >
                            <span
                                className="block aspect-square rounded-lg border border-line shadow-sm transition group-hover:scale-105"
                                style={{ background: colour }}
                            />
                            <span className="mt-1 flex items-center gap-1 font-mono text-[11px] text-ink-muted">
                                {copied === colour ? <Icon name="check" /> : null}
                                {copied === colour ? 'Copied' : colour}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export function MakeItYours({ item }: { item: GalleryItem }) {
    const link = clsx(
        'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
        FOCUS_RING,
    );
    return (
        <section aria-labelledby="remix-title" className={CARD}>
            <h2 id="remix-title" className={H2}>
                Make it yours
            </h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 leading-7 text-ink-muted">
                <li>Download the artwork as an SVG file.</li>
                <li>
                    Open the editor and press <RichText text="`mod+O`" /> to bring the file onto the
                    page.
                </li>
                <li>
                    It arrives as one group: <RichText text="`mod+shift+U`" /> ungroups it, then
                    every shape, path and text can be edited, recoloured or reused.
                </li>
            </ol>
            <div className="mt-4 flex flex-wrap gap-3">
                <a
                    href={galleryImage(item)}
                    download={`${item.id}.svg`}
                    className={clsx(link, 'bg-primary-600 text-white hover:bg-primary-700')}
                >
                    <Icon name="download" />
                    Download SVG
                </a>
                <Link
                    to="/draw"
                    className={clsx(link, 'border border-line text-ink hover:border-primary-300')}
                >
                    <Icon name="pen-tool" />
                    Open the editor
                </Link>
            </div>
        </section>
    );
}

export function MorePieces({ item }: { item: GalleryItem }) {
    const i = GALLERY_ITEMS.indexOf(item);
    const n = GALLERY_ITEMS.length;
    const prev = GALLERY_ITEMS[(i - 1 + n) % n]!;
    const next = GALLERY_ITEMS[(i + 1) % n]!;
    const card = (piece: GalleryItem, label: string, align: string) => (
        <Link
            to={galleryPath(piece)}
            className={clsx(
                'group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:border-primary-300',
                align,
                FOCUS_RING,
            )}
        >
            <img
                src={galleryImage(piece)}
                alt=""
                width={96}
                height={72}
                loading="lazy"
                className="h-[54px] w-[72px] shrink-0 rounded-lg object-cover"
            />
            <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    {label}
                </span>
                <span className="block truncate font-bold text-ink">{piece.title}</span>
            </span>
        </Link>
    );
    return (
        <nav aria-label="More pieces" className="grid gap-3 sm:grid-cols-2">
            {card(prev, 'Previous piece', '')}
            {card(next, 'Next piece', 'sm:flex-row-reverse sm:text-right')}
        </nav>
    );
}
