import type { HelpShortcut } from './helpShortcuts';
import { type HelpTopic, plainText, SHORTCUTS_TOPIC } from './helpTopics';

export interface HelpDoc {
    topicId: string;
    topicTitle: string;
    section?: string;
    text: string;
    caps?: string[];
    /** Searched but never shown. */
    hidden?: string;
    weight: number;
}

export type HelpHit = Omit<HelpDoc, 'hidden' | 'weight'>;

const WEIGHT = { topic: 30, section: 10, item: 5, shortcut: 8 };
const MAX_HITS = 24;

export function buildHelpIndex(
    topics: readonly HelpTopic[],
    shortcuts: readonly HelpShortcut[],
): HelpDoc[] {
    const docs = topics.flatMap((topic) => {
        const base = { topicId: topic.id, topicTitle: topic.title };
        return [
            { ...base, text: topic.summary, hidden: topic.keywords, weight: WEIGHT.topic },
            ...topic.sections.flatMap((section) => {
                const here = { ...base, section: section.title };
                return [
                    ...(section.text
                        ? [{ ...here, text: plainText(section.text), weight: WEIGHT.section }]
                        : []),
                    ...(section.items ?? []).map((item) => ({
                        ...here,
                        text: plainText(item),
                        weight: WEIGHT.item,
                    })),
                ];
            }),
        ];
    });

    const keys = shortcuts.map((row): HelpDoc => ({
        topicId: SHORTCUTS_TOPIC.id,
        topicTitle: SHORTCUTS_TOPIC.title,
        section: row.category,
        text: row.label,
        caps: row.caps,
        hidden: 'shortcut key',
        weight: WEIGHT.shortcut,
    }));

    return [...docs, ...keys];
}

export const searchTerms = (query: string): string[] =>
    query.toLowerCase().split(/\s+/).filter(Boolean);

/** Docs holding every word of the query, best first, at most one per section (per key for keys). */
export function searchHelp(docs: readonly HelpDoc[], query: string): HelpHit[] {
    const terms = searchTerms(query);
    if (!terms.length) return [];
    const phrase = terms.join(' ');

    const scored = docs.flatMap((doc) => {
        const text = doc.text.toLowerCase();
        const title = doc.topicTitle.toLowerCase();
        const section = doc.section?.toLowerCase() ?? '';
        const haystack = `${title} ${section} ${text} ${doc.hidden?.toLowerCase() ?? ''}`;
        if (!terms.every((term) => haystack.includes(term))) return [];
        // a word in the title only counts for the topic's own entry, or every line would tie
        const named = !doc.section && terms.every((term) => title.includes(term)) ? 40 : 0;
        const inText = text.includes(phrase) ? 6 : 0;
        return [{ doc, score: doc.weight + named + inText }];
    });
    scored.sort((a, b) => b.score - a.score);

    const seen = new Set<string>();
    const hits: HelpHit[] = [];
    for (const { doc } of scored) {
        const key = doc.caps ? `${doc.topicId}/${doc.text}` : `${doc.topicId}/${doc.section ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const { hidden: _hidden, weight: _weight, ...hit } = doc;
        hits.push(hit);
        if (hits.length === MAX_HITS) break;
    }
    return hits;
}
