import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import type { SymmetryEdge, SymmetrySourceKind } from '@/lib/canvas/symmetryFrame';
import { isMac } from '@/lib/utils/isMac';
import { Button } from '../../atoms/Button';
import { Chip } from '../../atoms/Chip';
import { Icon, type IconName } from '../../atoms/Icon';
import { Input } from '../../atoms/Input';

const SOURCES: { value: SymmetrySourceKind; label: string; icon: IconName; hint: string }[] = [
    { value: 'free', label: 'Free centre', icon: 'symmetry', hint: 'A centre you drag anywhere' },
    {
        value: 'page',
        label: 'Page',
        icon: 'table-cells-large',
        hint: 'The page centre or its edges',
    },
    {
        value: 'selection',
        label: 'Selection',
        icon: 'layer-group',
        hint: 'The selection’s centre or edges when you pick this',
    },
    {
        value: 'object',
        label: 'Object',
        icon: 'reflect',
        hint: 'The selected shape acts as the mirror and follows it',
    },
    {
        value: 'pin',
        label: 'Reference pin',
        icon: 'pin',
        hint: 'Named pins you drop, drag and turn',
    },
];

const EDGES: { value: SymmetryEdge; label: string }[] = [
    { value: 'center', label: 'Centre' },
    { value: 'left', label: 'Left edge' },
    { value: 'right', label: 'Right edge' },
    { value: 'top', label: 'Top edge' },
    { value: 'bottom', label: 'Bottom edge' },
    { value: 'diagonal', label: 'Diagonal' },
    { value: 'anchor', label: 'Anchor' },
];

const MOD = isMac ? '⌘' : 'Ctrl';

/** Pins: pick, rename, remove, add. */
function PinList() {
    const { pins, pinId, add, update, remove, pick } = useStore(
        useShallow((s) => ({
            pins: s.symmetryPins,
            pinId: s.symmetryPinId,
            add: s.addSymmetryPin,
            update: s.updateSymmetryPin,
            remove: s.removeSymmetryPin,
            pick: s.pickSymmetryPin,
        })),
    );
    return (
        <div className="flex flex-col gap-2">
            <ul className="flex flex-col gap-1" aria-label="Reference pins">
                {pins.map((p) => (
                    <li key={p.id} className="flex items-center gap-1">
                        <Chip
                            active={p.id === pinId}
                            aria-pressed={p.id === pinId}
                            aria-label={`Use ${p.name}`}
                            onClick={() => pick(p.id)}
                        >
                            <Icon name="pin" />
                        </Chip>
                        <Input
                            aria-label={`Name of ${p.name}`}
                            value={p.name}
                            maxLength={40}
                            onChange={(e) => update(p.id, { name: e.target.value })}
                            className="flex-1"
                        />
                        <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Remove ${p.name}`}
                            onClick={() => remove(p.id)}
                        >
                            <Icon name="trash-can" />
                        </Button>
                    </li>
                ))}
            </ul>
            <Button size="sm" variant="secondary" className="self-start" onClick={() => add()}>
                <Icon name="plus" />
                Drop a pin at the centre
            </Button>
            <p className="text-xs text-ink-muted">
                Drag a pin on the board; drag its round knob to turn the axis (15° steps, hold {MOD}{' '}
                for any angle). Pins snap to the page, objects and other pins.
            </p>
        </div>
    );
}

/** Where the symmetry comes from: free centre, page, selection, another object or a reference pin. */
export function SymmetrySourcePicker() {
    const { source, edge, setSource, setEdge } = useStore(
        useShallow((s) => ({
            source: s.symmetrySource,
            edge: s.symmetryEdge,
            setSource: s.setSymmetrySource,
            setEdge: s.setSymmetryEdge,
        })),
    );
    const usesEdge = source === 'page' || source === 'selection' || source === 'object';
    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Mirror source">
                {SOURCES.map((c) => (
                    <Chip
                        key={c.value}
                        active={source === c.value}
                        title={c.hint}
                        onClick={() => setSource(c.value)}
                    >
                        <Icon name={c.icon} />
                        {c.label}
                    </Chip>
                ))}
            </div>
            {usesEdge && (
                <div className="flex flex-wrap gap-1" role="group" aria-label="Mirror through">
                    {EDGES.filter((e) => e.value !== 'anchor' || source !== 'page').map((e) => (
                        <Chip
                            key={e.value}
                            active={edge === e.value}
                            onClick={() => setEdge(e.value)}
                        >
                            {e.label}
                        </Chip>
                    ))}
                </div>
            )}
            {source === 'selection' && (
                <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    onClick={() => setSource('selection')}
                >
                    Use the current selection again
                </Button>
            )}
            {source === 'pin' ? (
                <PinList />
            ) : (
                <p className="text-xs text-ink-muted">
                    Drag the centre handle on the board (snaps to objects; hold {MOD} to move
                    freely). While drawing, hold Alt and drag.
                </p>
            )}
        </div>
    );
}
