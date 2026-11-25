import { EditBarConfig } from '@/components/config/toolbars/ui/EditBarConfig';
import { GroupBarConfig } from '@/components/config/toolbars/ui/GroupBarConfig';
import { LAYERCONTROL_ACTIONS } from '@/components/config/toolbars/ui/LayerControlBarConfig';
import { LockBarConfig } from '@/components/config/toolbars/ui/LockBarConfig';

/**
 * Key labels come from the commands that own the keys (BUG-152): the menu used to carry its own
 * list, and six of those keys did nothing.
 */
const keysOf = (commands: readonly { id: string; shortcut?: string }[], id: string) =>
    commands.find((command) => command.id === id)?.shortcut;

export const KEYS = {
    copy: keysOf(EditBarConfig, 'copy'),
    paste: keysOf(EditBarConfig, 'paste'),
    duplicate: keysOf(EditBarConfig, 'duplicate'),
    delete: keysOf(EditBarConfig, 'delete'),
    group: keysOf(GroupBarConfig, 'group'),
    ungroup: keysOf(GroupBarConfig, 'ungroup'),
    lock: keysOf(LockBarConfig, 'lock'),
    unlock: keysOf(LockBarConfig, 'unlock'),
    toFront: keysOf(LAYERCONTROL_ACTIONS, 'bringtofront'),
    forward: keysOf(LAYERCONTROL_ACTIONS, 'bringforward'),
    backward: keysOf(LAYERCONTROL_ACTIONS, 'sendbackward'),
    toBack: keysOf(LAYERCONTROL_ACTIONS, 'sendtoback'),
};
