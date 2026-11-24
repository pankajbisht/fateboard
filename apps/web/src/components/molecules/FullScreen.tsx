import { Icon } from '@/components/atoms/Icon';
import { useStore } from '../../store';
import { IconButton } from '../atoms/IconButton';
import { Tooltip } from './Tooltip';

export const FullScreen = () => {
    const toggleFullscreen = useStore((state) => state.toggleFullscreen);
    const isFullScreen = useStore((state) => state.isFullScreen);
    // iPhone Safari has no Fullscreen API for pages: the button would light up and do nothing
    if (typeof document === 'undefined' || !document.documentElement.requestFullscreen) return null;

    return (
        <Tooltip position="bottom" content="Fullscreen">
            <IconButton
                active={isFullScreen}
                icon={<Icon name={isFullScreen ? 'compress' : 'expand'} />}
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
                aria-label="Toggle fullscreen"
                className="border border-line"
                size="chrome"
            />
        </Tooltip>
    );
};
