import { EditBarConfig, GroupBarConfig, LinkBarConfig, LockBarConfig } from './toolbars';

export const contextMenuRegistry = [
    ...EditBarConfig,
    { type: 'divider' },
    ...LinkBarConfig,
    { type: 'divider' },
    ...GroupBarConfig,
    { type: 'divider' },
    ...LockBarConfig,
];
