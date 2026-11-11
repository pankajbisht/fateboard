/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FontTemplate } from './fontTemplates.config';

import { readLocalList, writeLocalList } from '@/lib/storage';

const LIST = 'fontTemplates'; // stored as fateboard:fontTemplates (BUG-036)

function isTemplate(value: any): value is FontTemplate {
    return (
        !!value &&
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        Array.isArray(value.items) &&
        value.items.length > 0
    );
}

export function loadCustomTemplates(): FontTemplate[] {
    return readLocalList(LIST, isTemplate).map((t) => ({
        ...t,
        category: 'Mine' as const,
        custom: true,
    }));
}

function write(templates: FontTemplate[]) {
    writeLocalList(LIST, templates);
}

export function saveCustomTemplate(template: FontTemplate): FontTemplate[] {
    const next = [
        { ...template, category: 'Mine' as const, custom: true },
        ...loadCustomTemplates(),
    ];
    write(next);
    return next;
}

export function removeCustomTemplate(id: string): FontTemplate[] {
    const next = loadCustomTemplates().filter((t) => t.id !== id);
    write(next);
    return next;
}
