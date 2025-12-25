// import { useEditorStore } from "../store/useEditorStore";

import { useStore } from '../../store';

export function GradientTool1() {
    const { gradient, setGradient, applyFillGradient } = useStore();

    const updateStop = (index: number, data: any) => {
        const stops = [...gradient.stops];
        stops[index] = { ...stops[index], ...data };
        setGradient({ stops });
    };

    const addStop = () => {
        setGradient({
            stops: [...gradient.stops, { offset: 0.5, color: '#ffffff' }],
        });
    };

    const removeStop = (index: number) => {
        const stops = gradient.stops.filter((_, i) => i !== index);
        setGradient({ stops });
    };

    return (
        <div className="w-72 p-3 border rounded space-y-3">
            <h3 className="font-semibold">Gradient</h3>

            {/* Type */}
            <div className="flex gap-2">
                {['linear', 'radial'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setGradient({ type: t as any })}
                        className={`px-3 py-1 rounded border ${
                            gradient.type === t ? 'bg-black text-white' : ''
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Angle */}
            {gradient.type === 'linear' && (
                <div>
                    <label>Angle: {gradient.angle}°</label>
                    <input
                        type="range"
                        min={0}
                        max={360}
                        value={gradient.angle}
                        onChange={(e) =>
                            setGradient({
                                angle: +e.target.value,
                            })
                        }
                    />
                </div>
            )}

            {/* Stops */}
            <div className="space-y-2">
                {gradient.stops.map((stop, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <input
                            type="color"
                            value={stop.color}
                            onChange={(e) =>
                                updateStop(i, {
                                    color: e.target.value,
                                })
                            }
                        />
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={stop.offset * 100}
                            onChange={(e) =>
                                updateStop(i, {
                                    offset: +e.target.value / 100,
                                })
                            }
                        />
                        <button onClick={() => removeStop(i)}>✕</button>
                    </div>
                ))}
                <button onClick={addStop} className="text-sm underline">
                    + Add Stop
                </button>
            </div>

            {/* Preview */}
            <div
                className="h-8 rounded"
                style={{
                    background:
                        gradient.type === 'linear'
                            ? `linear-gradient(${gradient.angle}deg, ${gradient.stops
                                  .map((s) => `${s.color} ${s.offset * 100}%`)
                                  .join(', ')})`
                            : `radial-gradient(${gradient.stops
                                  .map((s) => `${s.color} ${s.offset * 100}%`)
                                  .join(', ')})`,
                }}
            />

            {/* Apply */}
            <button onClick={applyFillGradient} className="w-full bg-black text-white py-1 rounded">
                Apply to Shape
            </button>
        </div>
    );
}
