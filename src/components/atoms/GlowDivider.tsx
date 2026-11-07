export const ToolbarDivider = () => (
    <div className="relative mx-2 h-5 w-px">
        <div className="absolute inset-0 bg-line-strong" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/60 to-transparent" />
    </div>
);

export const InsetDivider = () => (
    <div className="relative mx-2 h-6 w-px">
        <div className="absolute inset-0 bg-line-strong" />
        <div className="absolute left-full inset-y-0 w-px bg-surface/50" />
    </div>
);

export const GlowDivider = () => (
    <div className="group relative mx-1.5 flex h-6 w-[2px] shrink-0 items-center justify-center">
        {/* Glow */}
        <div className="absolute inset-y-0 w-[6px] rounded-full bg-primary-400/20 blur-md transition group-hover:bg-primary-400/40" />

        {/* Core line */}
        <div className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-primary-400/70 to-transparent transition-opacity group-hover:via-primary-400" />

        {/* Highlight */}
        <div className="absolute inset-y-2 w-px bg-surface/50 opacity-60 group-hover:opacity-100 transition" />
    </div>
);

export const GlowDivider1 = () => (
    <div className="relative mx-3 flex h-6 w-[2px] items-center justify-center">
        {/* Outer soft glow */}
        <div className="absolute inset-y-0 w-[6px] rounded-full bg-primary-400/30 blur-md" />

        {/* Core gradient line */}
        <div className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-primary-400/80 to-transparent" />

        {/* Inner highlight */}
        <div className="absolute inset-y-2 w-px bg-surface/60" />
    </div>
);
