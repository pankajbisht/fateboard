import type { UserProp } from './userProps';

/** The prop pack file format (docs/PROPS.md phase 6). Tiny on purpose: the store imports it statically. */
export const PROP_PACK_FORMAT = 'fateboard-prop-pack';
export const PROP_PACK_VERSION = 1;

/** A prop pack file (JSON text) holding these props. */
export const makePropPack = (props: readonly UserProp[]) =>
    JSON.stringify({ format: PROP_PACK_FORMAT, version: PROP_PACK_VERSION, props }, null, 2);
