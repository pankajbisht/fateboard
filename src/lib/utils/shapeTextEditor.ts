/**
 * In-place text editor for text shapes (Figma / Canva style).
 *
 * A <textarea> is laid over the shape, matching its position, rotation, zoom and font.
 * The fabric group is never taken apart, so the shape cannot lose its size or position
 * while editing. The real textbox is only hidden (opacity 0) until editing ends.
 */
import { BRAND } from '@/lib/theme';
import * as fabric from 'fabric';

export interface ShapeTextEditorOptions {
    /** returns the fabric Textbox that lives inside the group */
    getText: (group: any) => any;
    /** re-wrap the text and grow the shape if needed */
    fit: (group: any) => void;
    /** editing finished */
    onEnd?: (changed: boolean, reselect: boolean) => void;
}

interface Active {
    group: any;
    ta: HTMLTextAreaElement;
    finish: (commit: boolean, reselect: boolean) => void;
}

let active: Active | null = null;

// the app's text float (FloatingTextToolbar): focus moving into it must not end editing
const TOOLBAR = '[data-text-float]';

export function isEditingShapeText(): boolean {
    return !!active;
}

/** Give the focus back to the textarea (used by the formatting bar). */
export function focusShapeTextEditor(): void {
    active?.ta.focus();
}

export function closeShapeTextEditor(commit = true): void {
    active?.finish(commit, false);
}

export function openShapeTextEditor(canvas: any, group: any, opts: ShapeTextEditorOptions): void {
    const text = opts.getText(group);
    if (!canvas || !text) return;

    // already editing this shape: just refocus
    if (active?.group === group) {
        active.ta.focus();
        return;
    }
    closeShapeTextEditor(true);

    const host: HTMLElement | null =
        canvas.wrapperEl ?? canvas.upperCanvasEl?.parentElement ?? null;
    if (!host) return;

    const startText: string = text.text ?? '';
    const prevOpacity: number = text.opacity ?? 1;

    const ta = document.createElement('textarea');
    ta.value = startText;
    ta.rows = 1;
    ta.spellcheck = false;
    ta.setAttribute('aria-label', 'Shape text');

    Object.assign(ta.style, {
        position: 'absolute',
        zIndex: '20',
        margin: '0',
        padding: '0',
        border: 'none',
        outline: `1px dashed ${BRAND.primary}`,
        outlineOffset: '2px',
        background: 'transparent',
        resize: 'none',
        overflow: 'hidden',
        boxSizing: 'border-box',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        transformOrigin: '50% 50%',
    } as Partial<CSSStyleDeclaration>);

    host.appendChild(ta);

    // hide the fabric text (opacity, not `visible`, so the group layout is unchanged)
    text.set('opacity', 0);

    /** CSS px -> canvas px ratio (the canvas can be shown scaled down in design mode) */
    const cssToCanvas = (): number => {
        const r = canvas.upperCanvasEl?.getBoundingClientRect();
        return r && r.width ? canvas.getWidth() / r.width || 1 : 1;
    };

    /** Runs on every render, so the textarea follows zoom / pan / resize AND font changes. */
    const layout = () => {
        const k = cssToCanvas();
        const zoom = canvas.getZoom() || 1;

        // scene units -> css px
        const s = (zoom * (group.scaleX || 1) * (text.scaleX || 1)) / k;

        const center = fabric.util.transformPoint(group.getCenterPoint(), canvas.viewportTransform);
        const w = Math.max(text.width * s, 20);

        // mirror the current text style (the formatting bar changes it while editing)
        ta.style.fontFamily = String(text.fontFamily || 'sans-serif');
        ta.style.fontWeight = String(text.fontWeight || 'normal');
        ta.style.fontStyle = String(text.fontStyle || 'normal');
        ta.style.textDecoration = text.underline ? 'underline' : 'none';
        ta.style.textAlign = String(text.textAlign || 'center');
        ta.style.color = typeof text.fill === 'string' ? text.fill : '#111827';

        ta.style.width = `${w}px`;
        ta.style.fontSize = `${text.fontSize * s}px`;
        // fabric's real line height = lineHeight * 1.13 (its font-size multiplier)
        ta.style.lineHeight = String((text.lineHeight || 1.16) * 1.13);

        ta.style.height = 'auto';
        const h = ta.scrollHeight;
        ta.style.height = `${h}px`;

        ta.style.left = `${center.x / k - w / 2}px`;
        ta.style.top = `${center.y / k - h / 2}px`;
        ta.style.transform = `rotate(${group.angle || 0}deg)`;
    };

    let done = false;

    const finish = (commit: boolean, reselect: boolean) => {
        if (done) return;
        done = true;

        const value = ta.value;

        ta.removeEventListener('input', onInput);
        ta.removeEventListener('keydown', onKeyDown);
        ta.removeEventListener('keyup', stop);
        ta.removeEventListener('blur', onBlur);
        document.removeEventListener('pointerdown', onDocDown, true);
        canvas.off('after:render', layout);
        canvas.off('mouse:down', onCanvasDown);
        ta.remove();

        text.set('text', commit ? value : startText);
        text.set('opacity', prevOpacity);

        opts.fit(group);
        group.set('dirty', true);
        group.setCoords();

        active = null;
        canvas.requestRenderAll();

        opts.onEnd?.(commit && value !== startText, reselect);
    };

    const onInput = () => {
        text.set('text', ta.value);
        opts.fit(group); // grows the shape while you type
        layout();
        canvas.requestRenderAll();
    };

    const stop = (e: Event) => e.stopPropagation();

    const onKeyDown = (e: KeyboardEvent) => {
        // keep Delete / Ctrl+Z / arrow shortcuts of the app away from the canvas
        e.stopPropagation();
        if (e.key === 'Escape') {
            e.preventDefault();
            finish(true, true);
        }
    };

    // focus moving to the formatting bar must NOT end the edit
    const onBlur = (e: FocusEvent) => {
        const next = e.relatedTarget as HTMLElement | null;
        if (next?.closest?.(TOOLBAR)) return;
        finish(true, false);
    };

    // clicking anywhere outside the textarea, the bar and the canvas ends the edit
    // (needed once focus has moved into the bar and blur no longer fires)
    const onDocDown = (e: Event) => {
        const t = e.target as HTMLElement | null;
        if (!t) return;
        if (t === ta || t.closest?.(TOOLBAR) || host.contains(t)) return;
        finish(true, false);
    };

    const onCanvasDown = () => finish(true, false);

    ta.addEventListener('input', onInput);
    ta.addEventListener('keydown', onKeyDown);
    ta.addEventListener('keyup', stop);
    ta.addEventListener('blur', onBlur);
    document.addEventListener('pointerdown', onDocDown, true);
    canvas.on('after:render', layout);
    canvas.on('mouse:down', onCanvasDown);

    active = { group, ta, finish };

    layout();
    canvas.requestRenderAll();
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
}
