import { useStore } from '../../store';

export function LinePanel({ closePanel }) {
    const lineStroke = useStore((s) => s.lineStroke);
    const lineWidth = useStore((s) => s.lineWidth);
    const setLineStroke = useStore((s) => s.setLineStroke);
    const setLineWidth = useStore((s) => s.setLineWidth);

    return (
        <div className="p-3 border bg-gray-100 w-64">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold">Line</h3>
                <button className="text-red-500 font-bold" onClick={closePanel}>
                    ✕
                </button>
            </div>

            <label className="block text-sm font-medium mb-2">Stroke</label>
            <input
                type="color"
                value={lineStroke}
                onChange={(e) => setLineStroke(e.target.value)}
            />

            <label className="block text-sm font-medium mt-4 mb-2">Width</label>
            <input
                type="range"
                min={1}
                max={20}
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-full"
            />

            <p className="text-xs text-gray-500 mt-3">
                Tip: Hold <kbd>Shift</kbd> to constrain to 0°, 45°, 90°.
            </p>
        </div>
    );
}
