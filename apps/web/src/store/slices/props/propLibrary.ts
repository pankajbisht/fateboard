import { propStorage } from '@/lib/storage';
import { makePropPack } from '@/props/packFormat';
import type { UserProp } from '@/props/userProps';

/** The parsing / sanitising code loads on first use (keeps it out of the store chunk). */
const userProps = () => import('@/props/userProps');

/**
 * The user's own props for the props slice (docs/PROPS.md phase 6): import an SVG / PNG file into the library,
 * remove one, export / import prop packs. Storage is `propStorage` (read-modify-write; entries this version
 * cannot read are kept). Every write goes through `parseUserProp`, so only validated, sanitised props are saved.
 */
export interface PropLibraryState {
    propUserLibrary: UserProp[];
    propUserLibraryStatus: 'idle' | 'loading' | 'ready' | 'error';
}

export interface PropLibraryActions {
    loadPropLibrary: () => Promise<void>;
    /** An SVG or PNG file into the library (PNG downscaled). True when saved. */
    importPropFile: (file: File) => Promise<boolean>;
    removeUserProp: (id: string) => Promise<boolean>;
    /** The whole library as a prop pack (JSON text) to download. */
    propPackJson: () => string;
    /** Props from a pack's text into the library (ids already there are skipped). Props added. */
    importPropPack: (text: string) => Promise<number>;
}

type Ctx = {
    set: (patch: Partial<PropLibraryState>, replace: false, action: string) => void;
    get: () => PropLibraryState & { showToast?: (o: { message: string }) => void };
};

const parseList = async (raw: unknown[]) => {
    const { parseUserProp } = await userProps();
    return raw.map(parseUserProp).filter((p): p is UserProp => !!p);
};

export function createPropLibrary({ set, get }: Ctx): PropLibraryState & PropLibraryActions {
    const toast = (message: string) => get().showToast?.({ message });
    const setList = async (raw: unknown[]) =>
        set(
            { propUserLibrary: await parseList(raw), propUserLibraryStatus: 'ready' },
            false,
            'props/library',
        );
    const ensureLoaded = async () => {
        if (get().propUserLibraryStatus !== 'ready') await actions.loadPropLibrary();
    };

    const actions: PropLibraryActions = {
        loadPropLibrary: async () => {
            set({ propUserLibraryStatus: 'loading' }, false, 'props/libraryLoading');
            try {
                await setList(await propStorage.loadLibrary());
            } catch (err) {
                console.error('[props] library not read', err);
                set({ propUserLibraryStatus: 'error' }, false, 'props/libraryError');
            }
        },

        importPropFile: async (file) => {
            try {
                const [{ readPropFile }, { parseUserProp, newUserPropId }] = await Promise.all([
                    import('@/feature/import/propFile'),
                    userProps(),
                ]);
                const read = await readPropFile(file);
                const prop = read && parseUserProp({ ...read, id: newUserPropId() });
                if (!prop) {
                    toast('Choose an SVG or PNG file to add to your props.');
                    return false;
                }
                await ensureLoaded();
                await setList(await propStorage.upsert(prop));
                toast(`“${prop.label}” added to My props.`);
                return true;
            } catch (err) {
                console.error('[props] could not import the file', err);
                toast('Could not add that file to your props.');
                return false;
            }
        },

        removeUserProp: async (id) => {
            try {
                await setList(await propStorage.remove(id));
                return true;
            } catch (err) {
                console.error('[props] library not saved', err);
                toast('Could not delete the prop.');
                return false;
            }
        },

        propPackJson: () => makePropPack(get().propUserLibrary),

        importPropPack: async (text) => {
            const { readPropPack } = await userProps();
            let pack: ReturnType<typeof readPropPack>;
            try {
                pack = readPropPack(text);
            } catch (err) {
                toast(err instanceof Error ? err.message : 'This file is not a prop pack.');
                return 0;
            }
            try {
                await ensureLoaded();
                const have = new Set(get().propUserLibrary.map((p) => p.id));
                const fresh = pack.props.filter((p) => !have.has(p.id));
                let raw: unknown[] | null = null;
                for (const p of fresh) raw = await propStorage.upsert(p);
                if (raw) await setList(raw);
                const skipped = pack.skipped ? ` (${pack.skipped} could not be read)` : '';
                toast(
                    `${fresh.length} prop${fresh.length === 1 ? '' : 's'} added to My props${skipped}.`,
                );
                return fresh.length;
            } catch (err) {
                console.error('[props] pack not imported', err);
                toast('Could not import the prop pack.');
                return 0;
            }
        },
    };

    return { propUserLibrary: [], propUserLibraryStatus: 'idle', ...actions };
}
