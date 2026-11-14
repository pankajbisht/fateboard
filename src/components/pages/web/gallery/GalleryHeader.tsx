/** Sticky header of the gallery pages (`/gallery`, `/gallery/:id`): logo home, optional back link, editor. */
import clsx from 'clsx';
import { Link } from 'react-router-dom';

import { PATHS } from '@/app/routes/paths';
import Brand from '@/components/atoms/Brand';
import { FOCUS_RING } from '@/components/atoms/control.styles';

const NAV_LINK = clsx(
    'whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-ink-muted transition hover:text-ink',
    FOCUS_RING,
);

export function GalleryHeader({ back }: { back?: { to: string; label: string } }) {
    return (
        <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
                <Link
                    to={PATHS.home}
                    aria-label="Fateboard home"
                    className={clsx('rounded-md', FOCUS_RING)}
                >
                    <Brand src="/fate.svg" alt="" className="h-8" />
                </Link>
                <nav className="flex items-center gap-1">
                    {back && (
                        <Link to={back.to} className={NAV_LINK}>
                            {back.label}
                        </Link>
                    )}
                    <Link
                        to={PATHS.draw}
                        className={clsx(
                            'ml-1 whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700',
                            FOCUS_RING,
                        )}
                    >
                        Start Drawing
                    </Link>
                </nav>
            </div>
        </header>
    );
}
