import { CANVAS_OFFSET } from '@/components/config/canvas.config';

function LeftRuler({ mouseY, scrollY, viewportHeight }: any) {
    const ZERO_Y = CANVAS_OFFSET - scrollY;

    const GRID_STEP = 100;
    const SUB_DIVS = 10;
    const SUB_STEP = GRID_STEP / SUB_DIVS;

    const RANGE = 2000;

    return (
        <div className="w-[16px] bg-slate-50 border-r border-slate-200 relative overflow-hidden select-none">
            {Array.from({ length: (RANGE * 2) / SUB_STEP }).map((_, i) => {
                const value = i * SUB_STEP - RANGE;
                const top = ZERO_Y + value;

                if (top < -60 || top > viewportHeight + 60) return null;

                const isMajor = value % GRID_STEP === 0;
                const isMid = value % GRID_STEP === GRID_STEP / 2;

                const width = isMajor ? 'w-full' : isMid ? 'w-[40%]' : 'w-[20%]';

                const color = isMajor ? 'border-slate-900' : 'border-slate-300';

                return (
                    <div
                        key={i}
                        className={`absolute right-0 border-t ${width} ${color}`}
                        style={{ top }}
                    >
                        {isMajor && (
                            <span className="absolute left-[6px] top-[6px] -rotate-90 origin-left text-[6px] text-slate-600 font-medium">
                                {value}
                            </span>
                        )}
                    </div>
                );
            })}

            {/* Origin */}
            <div
                className="absolute left-0 w-full h-[2px] bg-blue-600 pointer-events-none"
                style={{ top: ZERO_Y }}
            />

            {/* Cursor */}
            <div
                className="absolute left-0 w-full h-[1px] bg-red-500/80 pointer-events-none"
                style={{ top: ZERO_Y + mouseY }}
            />
        </div>
    );
}

export default LeftRuler;
