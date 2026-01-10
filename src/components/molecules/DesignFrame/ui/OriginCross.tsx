export function OriginCross() {
    return (
        <>
            <div
                className="absolute left-1/2 top-0 w-px h-full bg-red-500/40"
                style={{ transform: 'translateX(-0.5px)' }}
            />
            <div
                className="absolute top-1/2 left-0 h-px w-full bg-red-500/40"
                style={{ transform: 'translateY(-0.5px)' }}
            />
        </>
    );
}
