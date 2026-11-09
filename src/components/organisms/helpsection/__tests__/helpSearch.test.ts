import { describe, expect, it } from 'vitest';

import { buildHelpIndex, searchHelp } from '../helpSearch';
import type { HelpTopic } from '../helpTopics';

const topics: HelpTopic[] = [
    {
        id: 'layers',
        group: 'Organize',
        title: 'Layers',
        icon: 'layer-group',
        summary: 'Stacking order.',
        keywords: 'z-order',
        sections: [{ title: 'Rename', items: ['Double-click a name, or press `F2`'] }],
    },
    {
        id: 'export',
        group: 'Finish',
        title: 'Export',
        icon: 'file-export',
        summary: 'Save images.',
        sections: [
            { title: 'Formats', items: ['PNG for sharing', 'SVG stays sharp'] },
            { title: 'Layers of quality', text: 'Pick a multiplier.' },
        ],
    },
];

const docs = buildHelpIndex(topics, [
    { id: 'undo', label: 'Undo', category: 'History', caps: ['Ctrl', 'Z'], matches: () => false },
]);

describe('searchHelp', () => {
    it('finds text inside a section, not only topic titles', () => {
        const [hit] = searchHelp(docs, 'svg sharp');
        expect(hit).toMatchObject({ topicId: 'export', section: 'Formats' });
        expect(hit!.text).toBe('SVG stays sharp');
    });

    it('needs every word to match, in any order', () => {
        expect(searchHelp(docs, 'sharp svg')).toHaveLength(1);
        expect(searchHelp(docs, 'svg nonsense')).toEqual([]);
    });

    it('ranks a topic title above a mention in a section', () => {
        const hits = searchHelp(docs, 'layers');
        expect(hits[0]!.topicId).toBe('layers');
        expect(hits[0]!.section).toBeUndefined();
        expect(hits.some((h) => h.topicId === 'export')).toBe(true);
    });

    it('finds a topic through its hidden keywords', () => {
        expect(searchHelp(docs, 'z-order')[0]!.topicId).toBe('layers');
    });

    it('finds keyboard shortcuts, with their keys', () => {
        const [hit] = searchHelp(docs, 'undo');
        expect(hit).toMatchObject({ topicId: 'shortcuts', caps: ['Ctrl', 'Z'] });
    });

    it('shows key marks as plain words in results', () => {
        expect(searchHelp(docs, 'F2')[0]!.text).toBe('Double-click a name, or press F2');
    });

    it('returns one hit per section', () => {
        const hits = searchHelp(docs, 'sharing sharp png svg'.split(' ')[1]!);
        expect(new Set(hits.map((h) => `${h.topicId}/${h.section}`)).size).toBe(hits.length);
    });

    it('is empty for a blank query', () => {
        expect(searchHelp(docs, '   ')).toEqual([]);
    });
});
