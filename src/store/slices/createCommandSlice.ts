/** A runnable command (keyboard shortcut / command palette entry). */
export interface CommandEntry {
    id: string;
    label?: string;
    title?: string;
    description?: string;
    shortcut?: string;
    handler: () => void;
    [key: string]: unknown;
}

export interface CommandSlice {
    commands: CommandEntry[];
    runCommand: (id: string) => void;
    /** Resolves once `commands` is filled (see the note in the creator). */
    loadCommands: () => Promise<void>;
}

type ConfigCommand = {
    id: string;
    handler: (ctx: { get: () => any; set: (partial: any) => void }) => void;
};

export const createCommandSlice = (set: any, get: any, _store?: unknown): CommandSlice => {
    const build = (registry: ConfigCommand[]): CommandEntry[] =>
        registry.map((cmd) => ({
            ...(cmd as unknown as Record<string, unknown>),
            id: cmd.id,
            handler: () => cmd.handler({ get, set }),
        }));

    // The command registry is imported lazily. Its toolbar configs import the store, so a static import
    // here made `store/index.ts` <-> slices circular: importing any slice module before the store crashed
    // with "Cannot access 'createCanvasSlice' before initialization". Commands are ready one tick after the
    // store is created, long before the first keystroke.
    let loading: Promise<void> | null = null;
    const loadCommands = () => {
        loading ??= import('../../components/config/commandConfig.tsx')
            .then((m) => set({ commands: build(m.commandRegistry as unknown as ConfigCommand[]) }))
            .catch((error) =>
                console.error('[commands] failed to load the command registry', error),
            );
        return loading;
    };
    void loadCommands();

    return {
        commands: [],

        runCommand: (id) => {
            const cmd = get().commands.find((c: CommandEntry) => c.id === id);
            if (cmd) cmd.handler();
        },

        loadCommands,
    };
};
