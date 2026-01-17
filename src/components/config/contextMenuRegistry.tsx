import { EditBarConfig, GroupBarConfig, LockBarConfig } from './toolbars';

export const contextMenuRegistry = [
    ...EditBarConfig,
    { type: 'divider' },
    ...GroupBarConfig,
    { type: 'divider' },
    ...LockBarConfig,
];
