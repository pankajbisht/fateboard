import { StateCreator } from 'zustand';
import * as fabric from 'fabric';

export type Page = {
    id: string;
    name: string;
    canvasJSON: any;
    thumbnail?: string;
    createdAt: number;
};

export type PagesSlice = {
    pages: Page[];
    currentPageId: string | null;

    addPage: (canvas: fabric.Canvas) => void;
    deletePage: (id: string) => void;
    renamePage: (id: string, name: string) => void;
    switchPage: (canvas: fabric.Canvas, toId: string) => void;
    saveCurrentPage: (canvas: fabric.Canvas) => void;
};

export const createPagesSlice: StateCreator<PagesSlice, [], [], PagesSlice> = (set, get) => ({
    pages: [],
    currentPageId: null,

    addPage: (canvas) => {
        const id = crypto.randomUUID();

        const page: Page = {
            id,
            name: `Page ${get().pages.length + 1}`,
            canvasJSON: canvas.toJSON(),
            createdAt: Date.now(),
        };

        set((state) => ({
            pages: [...state.pages, page],
            currentPageId: id,
        }));
    },

    saveCurrentPage: (canvas) => {
        const { currentPageId, pages } = get();
        if (!currentPageId) return;

        set({
            pages: pages.map((p) =>
                p.id === currentPageId ? { ...p, canvasJSON: canvas.toJSON() } : p,
            ),
        });
    },

    switchPage: (canvas, toId) => {
        const { currentPageId, pages } = get();
        if (currentPageId === toId) return;

        // 1️⃣ Save current page
        const updatedPages = pages.map((p) =>
            p.id === currentPageId ? { ...p, canvasJSON: canvas.toJSON() } : p,
        );

        // 2️⃣ Load target page
        const nextPage = updatedPages.find((p) => p.id === toId);
        if (!nextPage) return;

        canvas.clear();
        canvas.loadFromJSON(nextPage.canvasJSON, () => {
            canvas.renderAll();
        });

        set({
            pages: updatedPages,
            currentPageId: toId,
        });
    },

    deletePage: (id) => {
        const { pages, currentPageId } = get();
        if (pages.length === 1) return;

        const remaining = pages.filter((p) => p.id !== id);
        const newCurrent = id === currentPageId ? remaining[0].id : currentPageId;

        set({
            pages: remaining,
            currentPageId: newCurrent,
        });
    },

    renamePage: (id, name) => {
        set((state) => ({
            pages: state.pages.map((p) => (p.id === id ? { ...p, name } : p)),
        }));
    },
});
