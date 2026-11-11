/**
 * The Help page must describe the editor that ships. These guards fail when a new panel has no
 * topic, a link points nowhere, or a claim about something that does not exist comes back.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { HELP_TOPICS, topicText } from '../helpTopics';

/**
 * The configs are read as text: importing them loads every panel, and each loaded file counts
 * towards the coverage total, which pushed the gate under its limit.
 */
const configSource = (file: string) =>
    readFileSync(resolve(process.cwd(), 'src/components', file), 'utf8')
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');

const panelIds = [
    ...configSource('organisms/editorsidebar/editorsidebar.config.tsx').matchAll(
        /id: '([^']+)'(?:(?!id: ')[\s\S])*?kind: 'panel'/g,
    ),
].map((m) => m[1]!);
const tabIds = [...configSource('config/tabs.config.tsx').matchAll(/^\s*id: '([^']+)'/gm)].map(
    (m) => m[1]!,
);
const allText = HELP_TOPICS.map(topicText).join('\n');

describe('help topics', () => {
    it('reads the panel and tab lists from the editor configs', () => {
        expect(panelIds).toEqual([
            'draw',
            'shapes',
            'text',
            'templates',
            'fonttemplates',
            'Pages',
            'layers',
        ]);
        expect(tabIds).toEqual([
            'appearance',
            'tiling',
            'rotate',
            'along-path',
            'filter',
            'export',
            'animate',
        ]);
    });

    it('has unique ids', () => {
        const ids = HELP_TOPICS.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(panelIds)('documents the left rail panel "%s"', (id) => {
        expect(HELP_TOPICS.some((t) => t.open?.panel === id)).toBe(true);
    });

    it.each(tabIds)('documents the right dock tab "%s"', (id) => {
        expect(HELP_TOPICS.some((t) => t.open?.tab === id)).toBe(true);
    });

    it('only links to panels and tabs that exist', () => {
        for (const { open } of HELP_TOPICS) {
            if (open?.panel) expect(panelIds).toContain(open.panel);
            if (open?.tab) expect(tabIds).toContain(open.tab);
        }
    });

    it('only relates to topics that exist', () => {
        const ids = new Set(HELP_TOPICS.map((t) => t.id));
        for (const t of HELP_TOPICS) for (const r of t.related ?? []) expect(ids).toContain(r);
    });

    it('explains the real node gestures', () => {
        const node = topicText(HELP_TOPICS.find((t) => t.id === 'node')!);
        for (const gesture of [
            /click a shape or a drawn path/i,
            /drag a node/i,
            /double-click the outline/i,
            /double-click a node/i,
            /alt/i,
            /enter/i,
            /escape/i,
        ]) {
            expect(node).toMatch(gesture);
        }
        expect(node).not.toMatch(/flowchart|mind map|connection handle|new node will be created/i);
    });

    it.each([
        ['PDF export', /\bpdf\b/i],
        ['an S key for Shapes', /`S`/],
        ['a T key for Text', /`T`/],
        ['a C key for colors', /`C`/],
        ['the wrong Ungroup key', /mod\+shift\+G/i],
        ['Shift to keep proportions', /shift[^.]*(keep|maintain)[^.]*(proportion|aspect)/i],
    ])('does not promise %s', (_name, claim) => {
        expect(allText).not.toMatch(claim);
    });

    it('documents the real keys of the Pen, Pencil and Laser pointer', () => {
        const topic = (id: string) => topicText(HELP_TOPICS.find((t) => t.id === id)!);
        expect(topic('pen')).toMatch(/`P`/);
        expect(topic('pencil')).toMatch(/`shift\+P`/);
        expect(topic('laser')).toMatch(/`K`/);
    });
});
