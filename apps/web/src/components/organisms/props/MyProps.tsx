import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { downloadBlob } from '@/lib/export/downloadBlob';
import { PROP_DRAG_TYPE } from '@/props/dragType';
import type { UserProp } from '@/props/userProps';
import Button from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { FOCUS_RING } from '../../atoms/control.styles';

const thumb = (p: UserProp) =>
    p.kind === 'png' ? p.data : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.data)}`;

function UserPropCard({
    prop,
    onAdd,
    onDelete,
}: {
    prop: UserProp;
    onAdd: () => void;
    onDelete: () => void;
}) {
    return (
        <li className="relative">
            <button
                type="button"
                draggable
                aria-label={`Add ${prop.label}`}
                title={`${prop.label}: click to add, or drag onto the page`}
                onClick={onAdd}
                onDragStart={(e) => {
                    e.dataTransfer.setData(PROP_DRAG_TYPE, prop.id);
                    e.dataTransfer.effectAllowed = 'copy';
                }}
                className={clsx(
                    'flex w-full cursor-grab flex-col items-center gap-0.5 rounded-md border border-line p-1 text-[11px] text-ink transition-colors hover:bg-surface-strong active:cursor-grabbing',
                    FOCUS_RING,
                )}
            >
                <img
                    src={thumb(prop)}
                    alt=""
                    width={64}
                    height={56}
                    loading="lazy"
                    draggable={false}
                    className="h-14 w-16 object-contain"
                />
                <span className="w-full truncate">{prop.label}</span>
            </button>
            <button
                type="button"
                aria-label={`Delete ${prop.label}`}
                title="Delete from My props"
                onClick={onDelete}
                className={clsx(
                    'absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-md text-[11px] text-ink-muted hover:bg-surface-strong hover:text-danger',
                    FOCUS_RING,
                )}
            >
                <Icon name="trash" />
            </button>
        </li>
    );
}

/**
 * "My props" (docs/PROPS.md phase 6): the user's own SVG / PNG props, saved in this browser's project
 * database. Import files or a prop pack, export the whole library as a pack, delete with a confirmation.
 */
export function MyProps() {
    const s = useStore(
        useShallow((st) => ({
            list: st.propUserLibrary,
            status: st.propUserLibraryStatus,
            load: st.loadPropLibrary,
            importFile: st.importPropFile,
            importPack: st.importPropPack,
            packJson: st.propPackJson,
            remove: st.removeUserProp,
            add: st.addProp,
            confirm: st.confirmDialog,
        })),
    );
    const fileRef = useRef<HTMLInputElement>(null);
    const packRef = useRef<HTMLInputElement>(null);
    const { status, load } = s;
    useEffect(() => {
        if (status === 'idle') void load();
    }, [status, load]);

    const ask = async (p: UserProp) => {
        const ok = await s.confirm({
            title: `Delete "${p.label}"?`,
            message: 'It is removed from My props. Copies already on pages stay.',
            confirmLabel: 'Delete',
            tone: 'danger',
        });
        if (ok) await s.remove(p.id);
    };

    return (
        <div className="flex flex-col gap-2">
            <input
                ref={fileRef}
                type="file"
                accept=".svg,.png,image/svg+xml,image/png"
                hidden
                aria-label="Import SVG or PNG"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void s.importFile(file);
                    e.target.value = '';
                }}
            />
            <input
                ref={packRef}
                type="file"
                accept=".json,application/json"
                hidden
                aria-label="Import prop pack"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) await s.importPack(await file.text());
                }}
            />
            <Button
                variant="secondary"
                size="sm"
                icon="upload"
                onClick={() => fileRef.current?.click()}
            >
                Import SVG or PNG
            </Button>
            {s.list.length ? (
                <ul aria-label="My props" className="grid grid-cols-3 gap-1.5">
                    {s.list.map((p) => (
                        <UserPropCard
                            key={p.id}
                            prop={p}
                            onAdd={() => void s.add(p.id)}
                            onDelete={() => void ask(p)}
                        />
                    ))}
                </ul>
            ) : (
                <p className="text-caption text-ink-muted">
                    No props of your own yet. Import an SVG or PNG, or a prop pack someone shared.
                </p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => packRef.current?.click()}>
                    Import pack
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={!s.list.length}
                    onClick={() =>
                        downloadBlob(
                            new Blob([s.packJson()], { type: 'application/json' }),
                            'my-props.fateprops.json',
                        )
                    }
                >
                    Export pack
                </Button>
            </div>
        </div>
    );
}
