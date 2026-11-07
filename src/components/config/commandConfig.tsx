import {
    EditBarConfig,
    FileBarConfig,
    GroupBarConfig,
    LinkBarConfig,
    LockBarConfig,
    ToolBarConfig,
    UndoRedoBarConfig,
    ZoomBarConfig,
} from './toolbars';

export const commandRegistry = [
    ...ToolBarConfig,
    ...FileBarConfig,
    ...EditBarConfig,
    ...LinkBarConfig,
    ...GroupBarConfig,
    ...LockBarConfig,
    ...ZoomBarConfig,
    ...UndoRedoBarConfig,
];
