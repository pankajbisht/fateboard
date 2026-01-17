import {
    EditBarConfig,
    FileBarConfig,
    GroupBarConfig,
    LockBarConfig,
    UndoRedoBarConfig,
    ZoomBarConfig,
} from './toolbars';

export const commandRegistry = [
    ...FileBarConfig,
    ...EditBarConfig,
    ...GroupBarConfig,
    ...LockBarConfig,
    ...ZoomBarConfig,
    ...UndoRedoBarConfig,
];
