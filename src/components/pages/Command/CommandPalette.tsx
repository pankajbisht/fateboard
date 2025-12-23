import { cn } from "../../../lib/utils/cn.ts";

export function Card({ className, ...props }) {
    return (
      <div
        className={cn(
          "rounded-2xl border bg-white shadow-md dark:bg-gray-100 dark:border-gray-800",
          className
        )}
        {...props}
      />
    );
  }

  export function CardHeader({ className, ...props }) {
    return (
      <div className={cn("p-4 border-b dark:border-gray-800", className)} {...props} />
    );
  }

  export function CardTitle({ className, ...props }) {
    return (
      <h3
        className={cn("text-lg font-semibold leading-none tracking-tight", className)}
        {...props}
      />
    );
  }

  export function CardContent({ className, ...props }) {
    return <div className={cn("p-4", className)} {...props} />;
  }


  // src/pages/CommandPalettePage.jsx
  import { useState, useEffect } from "react";

  const commands = [
    { id: 1, name: "New File", mac: "⌘N", win: "Ctrl+N" },
    { id: 2, name: "Open Settings", mac: "⌘,", win: "Ctrl+," },
    { id: 3, name: "Copy", mac: "⌘C", win: "Ctrl+C" },
    { id: 4, name: "Paste", mac: "⌘V", win: "Ctrl+V" },
    { id: 5, name: "Group", mac: "⌘G", win: "Ctrl+G" },
    { id: 6, name: "Ungroup", mac: "⌘⇧U", win: "Ctrl+Shift+U" },
  ];

  export default function CommandPalette() {
    const [query, setQuery] = useState("");
    const [os, setOs] = useState("win");

    useEffect(() => {
      const platform = navigator.platform.toLowerCase();
      if (platform.includes("mac")) {
        setOs("mac");
      }
    }, []);

    const filtered = commands.filter((cmd) =>
      cmd.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
      <div className="flex justify-center items-start pt-20">
        <Card className="w-full max-w-lg shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Command Palette</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              placeholder="Type a command..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mb-4"
            />

            <ul className="space-y-2">
              {filtered.map((cmd) => (
                <li
                  key={cmd.id}
                  className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <span>{cmd.name}</span>
                  <span className="text-sm text-gray-500">
                    {os === "mac" ? cmd.mac : cmd.win}
                  </span>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="text-gray-500 text-sm">No results found</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }
