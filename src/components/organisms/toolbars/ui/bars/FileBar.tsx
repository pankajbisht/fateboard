import { useStore } from '@/store';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { importFile } from '@/feature/import';
import { useRef } from 'react';
import { FileBarConfig } from '@/components/config/toolbars';
import { OPEN_ACCEPT } from '@/components/config/toolbars/fileActions';

function getFileActions(handlers) {
    // console.log(FileBarConfig, handlers.openFile);

    const x = FileBarConfig.map((config) => {
        if (config.id !== 'open') return config;

        return {
            ...config,
            onClick: handlers.openFile,
        };
    });

    return x;
}

const FileBar = () => {
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
                accept={OPEN_ACCEPT}
                hidden
                onChange={async (e) => {
                    if (!canvas) return;
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await importFile(canvas, file);
                    e.target.value = '';
                }}
            />

            <ul className="flex items-center gap-0.5">
                {actions.map((action) => (
                    <li key={action.id}>
                        <Tooltip
                            position="bottom"
                            content={
                                <div className="flex flex-col">
                                    <span>{action.label}</span>
                                    <span className="text-xs text-ink-muted">
                                        {action.shortcut}
                                    </span>
                                </div>
                            }
                        >
                            <IconButton
                                icon={action.icon}
                                title={action.title}
                                aria-label={action.title}
                                onClick={action.onClick}
                                size="chrome"
                            />
                        </Tooltip>
                    </li>
                ))}
            </ul>
        </>
    );
};

export { FileBar };
