import { useStore } from '@/store';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { importFile } from '@/feature/import';
import { FileBarConfig } from '../../../../config/commandConfig';

import { useRef } from 'react';

function getFileActions(handlers) {
    // console.log(FileBarConfig, handlers.openFile);

    const x = FileBarConfig.map((config) => {
        if (config.id !== 'open') return config;

        return {
            ...config,
            onClick: handlers.openFile,
        };
    });

    // console.log(x);

    return x;

    // const FILE_ACTIONS = [
    //     {
    //         id: 'new',
    //         tooltip: 'Create New Board',
    //         icon: <i className="fa-solid fa-file"></i>,
    //         onClick: () => useStore.getState().clearBoard(),
    //     },
    //     {
    //         id: 'open',
    //         tooltip: 'Open Board',
    //         icon: <i className="fa-regular fa-folder-open" />,
    //         onClick: () => handlers.openFile(),
    //     },
    //     {
    //         id: 'save',
    //         tooltip: 'Save Board',
    //         icon: <i className="fa-regular fa-floppy-disk" />,
    //         onClick: () => useStore.getState().saveBoard(),
    //     },
    //     // {
    //     //     id: 'export',
    //     //     tooltip: 'Export Board',
    //     //     icon: <i className="fa-solid fa-file-export"></i>,
    //     //     onClick: () => console.log('Align Left'),
    //     // },
    //     // {
    //     //     id: 'import',
    //     //     tooltip: 'Import Board',
    //     //     icon: <i className="fa-solid fa-file-arrow-up"></i>,
    //     //     onClick: () => console.log('Align Left'),
    //     // },
    // ];

    // return FILE_ACTIONS;
}

const FileBar = () => {
    const iconSize = useStore((state) => state.settings.iconSize);

    const fileInputRef = useRef(null);
    const canvas = useStore((s) => s.canvas);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const actions = getFileActions({
        openFile: handleUploadClick,
    });

    // console.log(actions);

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,.fateboard"
                hidden
                onChange={async (e) => {
                    if (!canvas) return;
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await importFile(canvas, file);
                    e.target.value = '';
                }}
            />

            <ul className="flex items-center gap-2 px-1">
                {actions.map((action) => (
                    <li key={action.id}>
                        <Tooltip
                            position="bottom"
                            content={
                                <div className="flex flex-col">
                                    <span>{action.label}</span>
                                    <span className="text-xs opacity-60">{action.shortcut}</span>
                                </div>
                            }
                        >
                            <IconButton
                                icon={action.icon}
                                title={action.tooltip}
                                aria-label={action.tooltip}
                                onClick={action.onClick}
                                size={iconSize}
                            />
                        </Tooltip>
                    </li>
                ))}
            </ul>
        </>
    );
};

export { FileBar };
