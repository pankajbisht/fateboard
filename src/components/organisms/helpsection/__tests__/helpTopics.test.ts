/**
 * The Help page must describe the editor that ships. These guards fail when a new panel has no
 * topic, a link points nowhere, or a claim about something that does not exist comes back.
 */
import { describe, expect, it } from 'vitest';

import { TABS_CONFIG } from '@/components/config/tabs.config';
import editorsidebarconfig from '@/components/organisms/editorsidebar/editorsidebar.config';

import { HELP_TOPICS, topicText } from '../helpTopics';

const panelIds = editorsidebarconfig.filter((i) => i.kind === 'panel').map((i) => i.id);
const tabIds: string[] = TABS_CONFIG.map((t) => t.id);
const allText = HELP_TOPICS.map(topicText).join('\n');

describe('help topics', () => {
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
        ['a P key for the Pencil', /`P`/],
        ['an S key for Shapes', /`S`/],
        ['a T key for Text', /`T`/],
        ['a C key for colors', /`C`/],
        ['the wrong Ungroup key', /mod\+shift\+G/i],
        ['Shift to keep proportions', /shift[^.]*(keep|maintain)[^.]*(proportion|aspect)/i],
    ])('does not promise %s', (_name, claim) => {
        expect(allText).not.toMatch(claim);
    });
});
