/**
 * `/gallery/:id`: how one gallery piece is made. A sticky stage replays the build step by step
 * (TutorialStage) beside a written walkthrough with the real editor controls (TutorialSteps), then
 * takeaways, the palette, "Make it yours" (download + `mod+O`) and the neighbouring pieces.
 * Each piece is its own prerendered route (`src/app/seo/routes.ts`). Light-only like the landing.
 */
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PATHS } from '@/app/routes/paths';
import { Icon } from '@/components/atoms/Icon';
import { FOCUS_RING } from '@/components/atoms/control.styles';

import { GalleryHeader } from '../web/gallery/GalleryHeader';
import { CATEGORY_LABEL, findGalleryItem, type GalleryItem } from '../web/gallery/galleryData';
import { GALLERY_TUTORIALS } from '../web/gallery/galleryTutorials';
import { extractPalette } from './artwork';
import { MakeItYours, MorePieces, Palette, Tricks } from './TutorialExtras';
import { TutorialStage } from './TutorialStage';
import { TutorialSteps } from './TutorialSteps';
import { useArtwork } from './useArtwork';

function Tutorial({ item }: { item: GalleryItem }) {
    const tutorial = GALLERY_TUTORIALS[item.id]!;
    const artwork = useArtwork(item);
    const [step, setStep] = useState(0);
    const palette = useMemo(() => (artwork.svg ? extractPalette(artwork.svg) : []), [artwork]);

    return (
        <>
            <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-8 sm:pt-14">
                <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
                    <Link to={PATHS.gallery} className="hover:text-ink">
                        Gallery
                    </Link>
                    <span aria-hidden> / </span>
                    <span>{CATEGORY_LABEL[item.category]}</span>
                </nav>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-ink sm:text-5xl">
                    How to make {item.title}
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-ink-muted">{tutorial.intro}</p>
                <ul className="mt-5 flex flex-wrap gap-2 text-sm" aria-label="About this tutorial">
                    {[
                        tutorial.level,
                        `About ${tutorial.minutes} min`,
                        `${tutorial.steps.length} steps`,
                        ...item.tools,
                    ].map((tag) => (
                        <li
                            key={tag}
                            className="rounded-full bg-surface-strong px-3 py-1 font-medium text-ink-muted"
                        >
                            {tag}
                        </li>
                    ))}
                </ul>
            </section>

            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-12">
                <div className="lg:sticky lg:top-24 lg:self-start">
                    <TutorialStage
                        title={item.title}
                        artwork={artwork}
                        steps={tutorial.steps}
                        step={step}
                        onStep={setStep}
                    />
                </div>
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-ink">Step by step</h2>
                    <TutorialSteps steps={tutorial.steps} step={step} onStep={setStep} />
                    <Tricks tricks={tutorial.tricks} />
                    <Palette colours={palette} />
                    <MakeItYours item={item} />
                    <MorePieces item={item} />
                </div>
            </div>
        </>
    );
}

export default function GalleryTutorialPage() {
    const { id } = useParams();
    const item = findGalleryItem(id);

    useEffect(() => {
        window.scrollTo?.(0, 0);
    }, [id]);

    return (
        <div className="theme-light min-h-screen bg-surface-muted text-ink antialiased">
            <GalleryHeader back={{ to: PATHS.gallery, label: 'All pieces' }} />
            <main>
                {item && GALLERY_TUTORIALS[item.id] ? (
                    <Tutorial key={item.id} item={item} />
                ) : (
                    <section className="mx-auto max-w-2xl px-4 py-24 text-center">
                        <h1 className="text-3xl font-bold text-ink">
                            This piece is not in the gallery
                        </h1>
                        <p className="mt-3 text-ink-muted">It may have been renamed or removed.</p>
                        <Link
                            to={PATHS.gallery}
                            className={clsx(
                                'mt-6 inline-flex items-center gap-2 font-semibold text-primary-ink hover:underline',
                                FOCUS_RING,
                            )}
                        >
                            <Icon name="chevron-left" />
                            Back to the gallery
                        </Link>
                    </section>
                )}
            </main>
        </div>
    );
}
