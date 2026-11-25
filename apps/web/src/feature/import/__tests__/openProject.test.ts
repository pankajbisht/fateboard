/**
 * One Save / Open for the whole app (top bar): Save downloads the whole project (all pages);
 * Open recognises a project file and restores all pages; older single-board files still open.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { importFile, isProjectJSON } from '..';

const original = useStore.getState();
afterEach(() => {
    useStore.setState({
        canvas: original.canvas,
        importProject: original.importProject,
        exportProject: original.exportProject,
    } as any);
    vi.restoreAllMocks();
});

const file = (name: string, body: unknown) =>
    new File([typeof body === 'string' ? body : JSON.stringify(body)], name, {
        type: 'application/json',
    });

describe('isProjectJSON', () => {
    it('knows a project (all pages) from a single Fabric board', () => {
        expect(isProjectJSON({ app: 'fateboard', version: 1, pages: [{ id: 'a' }] })).toBe(true);
        expect(isProjectJSON([{ id: 'a', json: {} }])).toBe(true); // bare page list
        expect(isProjectJSON({ version: '7.1.0', objects: [] })).toBe(false);
        expect(isProjectJSON(null)).toBe(false);
    });
});

describe('Open', () => {
    it('a project file restores all pages through importProject', async () => {
        const importProject = vi.fn(async () => true);
        const canvas = createFakeCanvas() as any;
        canvas.loadFromJSON = vi.fn();
        useStore.setState({ canvas, importProject } as any);
        const project = { app: 'fateboard', version: 1, pages: [{ id: 'p1', json: {} }] };
        await importFile(canvas, file('my.fateboard', project));
        expect(importProject).toHaveBeenCalledWith(JSON.stringify(project));
        expect(canvas.loadFromJSON).not.toHaveBeenCalled();
    });

    it('an older single-board file still opens on the current page', async () => {
        const importProject = vi.fn(async () => true);
        const canvas = createFakeCanvas() as any;
        canvas.loadFromJSON = vi.fn(async () => {});
        useStore.setState({ canvas, importProject } as any);
        await importFile(canvas, file('old.fateboard', { version: '7.1.0', objects: [] }));
        expect(importProject).not.toHaveBeenCalled();
        expect(canvas.loadFromJSON).toHaveBeenCalled();
    });
});

describe('Save', () => {
    it('downloads the whole project (all pages), not just the current page', async () => {
        const exportProject = vi.fn(() => '{"app":"fateboard","pages":[1,2]}');
        const canvas = createFakeCanvas() as any;
        useStore.setState({ canvas, exportProject } as any);
        let saved: Blob | null = null;
        (URL as any).createObjectURL = vi.fn((b: Blob) => ((saved = b), 'blob:x'));
        (URL as any).revokeObjectURL = vi.fn();
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        useStore.getState().saveBoard();
        expect(exportProject).toHaveBeenCalled();
        expect(click).toHaveBeenCalled();
        expect(await saved!.text()).toBe('{"app":"fateboard","pages":[1,2]}');
    });
});
