import {
    EditBarConfig,
    FileBarConfig,
    GroupBarConfig,
    LinkBarConfig,
    LockBarConfig,
    ToolBarConfig,
    TextBarConfig,
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
    ...TextBarConfig,
];
