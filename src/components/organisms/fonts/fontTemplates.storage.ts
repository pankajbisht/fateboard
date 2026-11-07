/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FontTemplate } from './fontTemplates.config';

const STORAGE_KEY = 'fateboard:fontTemplates';

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
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed
                  .filter(isTemplate)
                  .map((t) => ({ ...t, category: 'Mine' as const, custom: true }))
            : [];
    } catch {
        return [];
    }
}

function write(templates: FontTemplate[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
        console.error('Failed to save font templates:', error);
    }
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
