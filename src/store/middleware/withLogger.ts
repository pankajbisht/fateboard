import { logger } from "../../lib/utils/logger";

export const withLogger = (config: any) => (set: any, get: any, api: any) =>
  config(
    (partial: any, replace: boolean) => {
      if (partial?.type) {
        logger.info("Zustand action", {
          source: "Zustand",
          action: partial.type,
          data: partial,
        });
      }

      set(partial, replace);
    },
    get,
    api
  );
