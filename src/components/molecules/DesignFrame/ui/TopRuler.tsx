import { CANVAS_OFFSET } from '@/components/config/canvas.config';

function TopRuler({ mouseX, scrollX, viewportWidth }: any) {
    const ZERO_X = CANVAS_OFFSET - scrollX;

    const GRID_STEP = 100;
    const SUB_DIVS = 10;
    const SUB_STEP = GRID_STEP / SUB_DIVS;

    const RANGE = 2000;

    return (
        <div className="h-[16px] bg-slate-50 border-b border-slate-200 relative overflow-hidden select-none">
            {Array.from({ length: (RANGE * 2) / SUB_STEP }).map((_, i) => {
                const value = i * SUB_STEP - RANGE;
                const left = ZERO_X + value + 15;

                if (left < -60 || left > viewportWidth + 60) return null;

                const isMajor = value % GRID_STEP === 0;
                const isMid = value % GRID_STEP === GRID_STEP / 2;

                const height = isMajor ? 'h-full' : isMid ? 'h-[40%]' : 'h-[20%]';

                const color = isMajor ? 'border-slate-500' : 'border-slate-300';

                return (
                    <div
                        key={i}
                        className={`absolute bottom-0 border-l ${height} ${color}`}
                        style={{ left }}
                    >
                        {isMajor && (
                            <span className="absolute top-[4px] left-[4px] text-[6px] text-slate-600 font-medium">
                                {value}
                            </span>
                        )}
                    </div>
                );
            })}

            {/* Origin */}
            <div
                className="absolute top-0 h-full w-[2px] bg-blue-600 pointer-events-none"
                style={{ left: ZERO_X + 15 }}
            />

            {/* Cursor */}
            <div
                className="absolute top-0 h-full w-[1px] bg-red-500/80 pointer-events-none"
                style={{ left: ZERO_X + mouseX + 15 }}
            />
        </div>
    );
}

export default TopRuler;
