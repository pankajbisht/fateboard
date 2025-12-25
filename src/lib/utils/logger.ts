export type LogLevel = 'info' | 'warn' | 'error';

export type LogEntry = {
    time: string;
    level: LogLevel;
    message: string;
    source?: string; // Zustand / Canvas / UI
    action?: string; // canvas/addShape
    data?: unknown;
};

const logs: LogEntry[] = [];

function log(level: LogLevel, message: string, options: Partial<LogEntry> = {}) {
    const entry: LogEntry = {
        time: new Date().toLocaleTimeString(),
        level,
        message,
        ...options,
    };

    logs.push(entry);

    if (level === 'error') console.error(entry);
    else if (level === 'warn') console.warn(entry);
    else console.log(entry);
}

export const logger = {
    info: (msg: string, opts?: Partial<LogEntry>) => log('info', msg, opts),

    warn: (msg: string, opts?: Partial<LogEntry>) => log('warn', msg, opts),

    error: (msg: string, opts?: Partial<LogEntry>) => log('error', msg, opts),

    getLogs: () => logs,
};
