import { Icon } from '@/components/atoms/Icon';
import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

/**
 * Linked clones (lib/linkedClones): Clone ⌥D lives in the Edit bar; these act on links and show in
 * the right-click menu only when they apply. Shortcuts follow Inkscape (⇧⌥D = unlink clone).
 */
export const LinkBarConfig = [
    {
        id: 'select-linked',
        label: 'Select linked copies',
        title: 'Select every copy linked with this one',
        description: 'Select every copy linked with this one',
        icon: <Icon name="layer-group" />,
        when: () => useStore.getState().hasLinkedSelection(),
        onClick: () => useStore.getState().selectLinked(),
        handler: ({ get }: { get: typeof useStore.getState }) => get().selectLinked(),
    },
    {
        id: 'unlink-clone',
        label: 'Unlink clone',
        title: 'Make this copy independent',
        description: 'Make the selected linked copy independent',
        shortcut: shortcut('⇧⌥D', 'Shift+Alt+D'),
        icon: <Icon name="unlink" />,
        when: () => useStore.getState().hasLinkedSelection(),
        onClick: () => useStore.getState().unlinkClone(),
        handler: ({ get }: { get: typeof useStore.getState }) => get().unlinkClone(),
    },
    {
        id: 'link-clones',
        label: 'Link copies',
        title: 'Link the selected objects: they share the look of the bottom one',
        description: 'Link the selected objects so they share one look',
        icon: <Icon name="link" />,
        when: () => useStore.getState().canLinkSelection(),
        onClick: () => useStore.getState().linkClones(),
        handler: ({ get }: { get: typeof useStore.getState }) => get().linkClones(),
    },
];
