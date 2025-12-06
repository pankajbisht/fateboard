import { commandRegistry as commandConfig } from "../../components/config/commandConfig.tsx";

export const createCommandSlice = (set, get) => {
  const commands = commandConfig.map((cmd) => ({
    ...cmd,
    handler: () => cmd.handler({ get, set }),
  }));

  return {
    commands,

    runCommand: (id) => {
      const cmd = get().commands.find((c) => c.id === id);
      if (cmd) cmd.handler();
    },
  };
};
