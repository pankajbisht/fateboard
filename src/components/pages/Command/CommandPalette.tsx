import { commandRegistry } from '@/components/config/commandConfig.tsx';
import { cn } from '../../../lib/utils/cn.ts';

export function Card({ className, ...props }: { className?: string; [k: string]: any }) {
    return (
        <div
            className={cn(
                'rounded-2xl border bg-white shadow-md dark:bg-gray-100 dark:border-gray-800',
                className,
            )}
            {...props}
        />
    );
}

export function CardHeader({ className, ...props }: { className?: string; [k: string]: any }) {
    return <div className={cn('p-4 border-b dark:border-gray-800', className)} {...props} />;
}

export function CardTitle({ className, ...props }: { className?: string; [k: string]: any }) {
    return (
        <h3
            className={cn('text-lg font-semibold leading-none tracking-tight', className)}
            {...props}
        />
    );
}

export function CardContent({ className, ...props }: { className?: string; [k: string]: any }) {
    return <div className={cn('p-4', className)} {...props} />;
}

import { useState, useEffect } from 'react';
import { shortcut } from '@/lib/utils/isMac.ts';

const commands = commandRegistry;

//console.log(commands);

export default function CommandPalette() {
    const [query, setQuery] = useState('');
    const [os, setOs] = useState('win');

    useEffect(() => {
        const platform = navigator.platform.toLowerCase();
        if (platform.includes('mac')) {
            setOs('mac');
        }
    }, []);

    const filtered = commands.filter((cmd) => cmd.name.toLowerCase().includes(query.toLowerCase()));

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
                                <span className="text-sm text-gray-500">{cmd.shortcut}</span>
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
