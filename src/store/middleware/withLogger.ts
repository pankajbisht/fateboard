import { logger } from '../../lib/utils/logger';

export const withLogger = (config: any) => (set: any, get: any, api: any) =>
    config(
        (partial: unknown, replace: boolean) => {
            const p = partial as { type?: string } | undefined;
            if (p && p.type) {
                logger.info('Zustand action', {
                    source: 'Zustand',
                    action: p.type,
                    data: p,
                });
            }

            // cast back to any for set() which accepts partial state
            set(partial as any, replace);
        },
        get,
        api,
    );
