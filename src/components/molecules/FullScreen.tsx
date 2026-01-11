import { useStore } from '../../store';
import { IconButton } from '../atoms/IconButton';
import { Tooltip } from './Tooltip';

export const FullScreen = () => {
    const toggleFullscreen = useStore((state) => state.toggleFullscreen);
    const isFullScreen = useStore((state) => state.isFullScreen);
    const iconSize = useStore((state) => state.settings.iconSize);

    return (
        <Tooltip position="bottom" content="Fullscreen">
            <IconButton
                active={isFullScreen}
                icon={<i className={`fa-solid ${isFullScreen ? 'fa-compress' : 'fa-expand'}`}></i>}
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
                className="border border-stone-200"
                size={iconSize}
            />
        </Tooltip>
    );
};
