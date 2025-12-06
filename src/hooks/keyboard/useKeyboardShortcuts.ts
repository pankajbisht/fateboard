import { useEffect } from "react";
import { useStore } from "@store";

export function useKeyboardShortcuts() {
  const commands = useStore((s) => s.commands);
  const runCommand = useStore((s) => s.runCommand);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;

      // ✅ Skip if user is typing in input/textarea/contentEditable
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Build pressed combo string
      const keyCombo = [
        e.metaKey ? "Meta" : "",
        e.ctrlKey ? "Ctrl" : "",
        e.shiftKey ? "Shift" : "",
        e.altKey ? "Alt" : "",
        e.key.length === 1 ? e.key.toLowerCase() : e.key,
      ]
        .filter(Boolean)
        .join("+");


      // Find matching command
      const command = commands.find((c) =>
        c.shortcut?.some((s) => s.toLowerCase() === keyCombo.toLowerCase())
      );

      if (command) {
        e.preventDefault(); // stop browser default (like Cmd+S)
        runCommand(command.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commands, runCommand]);
}
