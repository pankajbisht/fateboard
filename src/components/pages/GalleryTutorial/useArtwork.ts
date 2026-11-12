import { useEffect, useState } from 'react';

import { galleryImage, type GalleryItem } from '../web/gallery/galleryData';

export type ArtworkState =
    | { status: 'loading'; svg: null }
    | { status: 'ready'; svg: string }
    | { status: 'error'; svg: null };

/** The piece's SVG source (the stage shows it inline so it can reveal one step at a time). */
export function useArtwork(item: GalleryItem): ArtworkState {
    const [state, setState] = useState<ArtworkState>({ status: 'loading', svg: null });

    useEffect(() => {
        let alive = true;
        setState({ status: 'loading', svg: null });
        fetch(galleryImage(item))
            .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
            .then((svg) => alive && setState({ status: 'ready', svg }))
            .catch((error) => {
                console.error('[gallery] could not load artwork', item.id, error);
                if (alive) setState({ status: 'error', svg: null });
            });
        return () => {
            alive = false;
        };
    }, [item]);

    return state;
}
