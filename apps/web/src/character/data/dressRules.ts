import type { AccessoryKind, Dress } from '../schema/types';
import { TOP_DEFS } from './garments';
import { normalizeHeld } from './props';
import { ACCESSORY_DEFS } from './wardrobe';

/**
 * What does not go together (docs/CHARACTER_STUDIO.md phase 3): one rule list, applied wherever a dress is read
 * (`parseCharacter`), so a saved, imported or edited dress is always consistent. Two accessories for one place
 * (two hats): the first stays. A tie needs a shirt collar, a scarf does not go over a hood or a high collar, a belt
 * is hidden under a long top, earrings do not go under a helmet. `explainDress` says what was removed and why.
 */
export interface Removed {
    kind: AccessoryKind;
    reason: string;
}

export function resolveDress(dress: Dress): { dress: Dress; removed: Removed[] } {
    const top = TOP_DEFS[dress.top.kind];
    const removed: Removed[] = [];
    const slots = new Map<string, AccessoryKind>();
    const kept: Dress['accessories'] = [];
    for (const a of dress.accessories) {
        const d = ACCESSORY_DEFS[a.kind];
        const why =
            slots.has(d.slot) && slots.get(d.slot) !== a.kind
                ? `only one ${d.slot === 'head' ? 'head cover' : d.slot} at a time (${ACCESSORY_DEFS[slots.get(d.slot)!].name} is on)`
                : d.needs && !d.needs.includes(top.collar)
                  ? `${d.name} needs a shirt collar`
                  : d.blocksCollar?.includes(top.collar)
                    ? `${d.name} does not go with this collar`
                    : d.blocksHang?.includes(top.hang)
                      ? `${d.name} is hidden under a long top`
                      : null;
        if (why) {
            removed.push({ kind: a.kind, reason: why });
            continue;
        }
        slots.set(d.slot, a.kind);
        kept.push(a);
    }
    // blocks between accessories: the one that is blocked goes (earrings under a helmet), whatever the order
    const final = kept.filter((a) => {
        const d = ACCESSORY_DEFS[a.kind];
        // `blocksWith` lists what an accessory keeps off: the helmet removes the earrings, not the other way round
        const by = kept.find((o) => ACCESSORY_DEFS[o.kind].blocksWith?.includes(a.kind));
        if (by) {
            removed.push({
                kind: a.kind,
                reason: `${d.name} does not go with the ${ACCESSORY_DEFS[by.kind].name.toLowerCase()}`,
            });
            return false;
        }
        return true;
    });
    const worn = removed.length ? final : dress.accessories;
    // gloves cover the hands: nothing can be held with them on
    const gloved = worn.some((a) => a.kind === 'boxing-gloves' || a.kind === 'mma-gloves');
    return {
        dress: {
            ...dress,
            accessories: worn,
            held: gloved ? [] : normalizeHeld(dress.held ?? []),
        },
        removed,
    };
}

/** Adds an accessory: it replaces whatever is worn in the same place, then the rules run. */
export function wear(dress: Dress, kind: AccessoryKind, color?: string): Dress {
    const d = ACCESSORY_DEFS[kind];
    const rest = dress.accessories.filter((a) => ACCESSORY_DEFS[a.kind].slot !== d.slot);
    return resolveDress({ ...dress, accessories: [...rest, { kind, color: color ?? d.color }] })
        .dress;
}

export const takeOff = (dress: Dress, kind: AccessoryKind): Dress => ({
    ...dress,
    accessories: dress.accessories.filter((a) => a.kind !== kind),
});
