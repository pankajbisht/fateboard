import { useStore } from '@store';
import { MAX_ZOOM, MIN_ZOOM } from '@/store/slices/createPageSlice';
import { Slider } from '@/components/atoms/Slider';
import { useBoardMode } from '@hooks/useBoardMode';
import { IconButton } from '@/components/atoms/IconButton';
import { Button } from '@/components/atoms/Button';
import { useUnit } from '@hooks/useUnit';
import { formatSize } from '@/lib/units';
import { Icon } from '@/components/atoms/Icon';

/* Log scale (like Figma): 100% sits mid-track and small zoom steps stay precise. */
const LOG_RANGE = Math.log(MAX_ZOOM / MIN_ZOOM);
export const zoomToSlider = (zoom: number) =>
    Math.round(
        (Math.log(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) / MIN_ZOOM) / LOG_RANGE) * 1000,
    ) / 10;
export const sliderToZoom = (t: number) => MIN_ZOOM * Math.exp((t / 100) * LOG_RANGE);

/**
 * The app's one zoom control (footer): − slider + , the visible % (click = 100%) and Fit, with
 * the page size under it. Keyboard shortcuts call the same actions.
 */
export function ZoomControl() {
    const zoom = useStore((s) => s.zoom);
    const scale = useStore((s) => s.scale);
    const setZoom = useStore((s) => s.setZoom);
    const fitToScreen = useStore((s) => s.fitToScreen);
    const zoomIn = useStore((s) => s.zoomIn);
    const zoomOut = useStore((s) => s.zoomOut);
    const actualSize = useStore((s) => s.actualSize);
    const preset = useStore((s) => s.selectedPreset);
    const unit = useUnit(); // Settings > Units (BUG-082)
    const whiteboard = useBoardMode() === 'whiteboard'; // infinite canvas: no page size

    const percent = Math.round((scale || 1) * zoom * 100);

    return (
        <div className="flex items-center gap-1">
            <IconButton
                size="chrome"
                icon={<Icon name="minus" />}
                aria-label="Zoom out"
                title="Zoom out"
                onClick={zoomOut}
            />
            <div data-footer-stack className="flex w-36 flex-col gap-0.5 max-sm:hidden">
                <Slider
                    aria-label="Zoom"
                    aria-valuetext={`${percent}%`}
                    min={0}
                    max={100}
                    step={0.5}
                    value={zoomToSlider(zoom)}
                    onChange={(t) => setZoom(sliderToZoom(t))}
                />
                {preset && !whiteboard && (
                    <span className="text-[11px] leading-none tabular-nums text-ink-muted">
                        {formatSize(preset.width, preset.height, unit)}
                    </span>
                )}
            </div>
            <IconButton
                size="chrome"
                icon={<Icon name="plus" />}
                aria-label="Zoom in"
                title="Zoom in"
                onClick={zoomIn}
            />
            <Button
                variant="ghost"
                size="sm"
                aria-label={`Zoom ${percent}%. Zoom to 100%`}
                title="Zoom to 100%"
                onClick={actualSize}
                className="w-11 shrink-0 justify-center px-0 text-[11px] font-semibold tabular-nums text-ink"
            >
                {percent}%
            </Button>
            <IconButton
                size="chrome"
                icon={<Icon name="zoom-fit" />}
                aria-label="Fit to screen"
                title="Fit to screen"
                onClick={fitToScreen}
            />
        </div>
    );
}

export default ZoomControl;
