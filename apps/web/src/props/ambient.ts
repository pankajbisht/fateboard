import type { PropDef } from './types';

/**
 * The ambient animation that suits a prop (docs/PROPS.md phase 5): plants sway in the wind, clouds drift.
 * Ids are stable (saved on pages), so matching them is safe; null = no ambient motion.
 */
const SWAYS = /^(tree-|bush|flower-|grass-|tall-grass|sunflower|bamboo|tanabata|koinobori)/;

export function ambientFor(def: Pick<PropDef, 'id'>): 'windSway' | 'drift' | null {
    if (def.id.startsWith('cloud-')) return 'drift';
    return SWAYS.test(def.id) ? 'windSway' : null;
}
