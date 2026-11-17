/**
 * Arrange / group / fill / stroke icons (owner redraw request 2026-11-17): arrange = two overlapping objects,
 * the moved one solid, an arrow in the free corner (a bar on it for "to front / to back"); group = shapes
 * inside selection brackets; fill / stroke add + remove = one swatch with a + or a red × badge.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Icon, type IconName } from '../Icon';

afterEach(cleanup);

const draw = (name: IconName) => render(<Icon name={name} />).container.querySelector('svg')!;
const filled = (el: SVGElement) => [...el.querySelectorAll('[fill="currentColor"]')];
const paths = (el: SVGElement) => el.querySelectorAll('path').length;

describe('arrange icons', () => {
    const bring = ['bring-to-front', 'bring-forward'] as const;
    const send = ['send-to-back', 'send-backward'] as const;

    it('show two overlapping objects with only the moved one solid', () => {
        for (const name of [...bring, ...send]) {
            const el = draw(name);
            expect(el.querySelectorAll('rect').length, name).toBe(1);
            expect(filled(el).length, name).toBe(1);
            cleanup();
        }
    });

    it('bring = the front object is solid, send = the visible part of the back object is solid', () => {
        for (const name of bring) {
            expect(filled(draw(name))[0].tagName, name).toBe('rect');
            cleanup();
        }
        for (const name of send) {
            expect(filled(draw(name))[0].tagName, name).toBe('path');
            cleanup();
        }
    });

    it('to front / to back add a stop bar to the arrow', () => {
        const front = paths(draw('bring-to-front'));
        cleanup();
        const forward = paths(draw('bring-forward'));
        cleanup();
        const back = paths(draw('send-to-back'));
        cleanup();
        const backward = paths(draw('send-backward'));
        expect(front).toBe(forward + 1);
        expect(back).toBe(backward + 1);
    });
});

describe('group icons', () => {
    it('group: a rectangle and a circle inside four selection brackets, no dashes', () => {
        const el = draw('object-group');
        expect(el.querySelectorAll('rect').length).toBe(1);
        expect(el.querySelectorAll('circle').length).toBe(1);
        expect(paths(el)).toBe(4);
        expect(el.querySelector('[stroke-dasharray]')).toBeNull();
    });

    it('ungroup: the same shapes pulled apart, the brackets broken open', () => {
        const el = draw('object-ungroup');
        expect(el.querySelectorAll('rect').length).toBe(1);
        expect(el.querySelectorAll('circle').length).toBe(1);
        expect(paths(el)).toBe(2);
    });
});

describe('fill / stroke add + remove icons', () => {
    const swatch = (el: SVGElement) => {
        const r = el.querySelector('rect')!;
        return ['x', 'y', 'width', 'height'].map((a) => r.getAttribute(a)).join(' ');
    };

    it('add and remove share one swatch; add has a + badge, remove a red × badge', () => {
        for (const kind of ['fill', 'stroke'] as const) {
            const add = draw(`${kind}-add`);
            const addSwatch = swatch(add);
            expect(add.querySelector('.text-danger'), kind).toBeNull();
            cleanup();
            const remove = draw(`${kind}-remove`);
            expect(swatch(remove), kind).toBe(addSwatch);
            expect(remove.querySelector('.text-danger'), kind).not.toBeNull();
            cleanup();
        }
    });

    it('fill swatches are solid, stroke swatches are hollow', () => {
        expect(draw('fill-add').querySelector('rect')!.getAttribute('fill')).toBe('currentColor');
        cleanup();
        expect(draw('stroke-add').querySelector('rect')!.getAttribute('fill')).toBeNull();
    });
});
