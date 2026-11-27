/**
 * The Character Studio as people use it (phase 1): open from the Characters panel, change the body, pick a
 * pose, turn the camera, select a part, undo with the keyboard, place on the page, close with Esc.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- partial store state and a fake canvas */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { characterStorage } from '@/lib/storage';
import CharacterStudio from '../CharacterStudio';
import CharactersPanel from '../CharactersPanel';

let prev: any;
let canvas: any;
const studio = () => screen.getByRole('dialog', { name: 'Character Studio' });
const tab = (name: string) =>
    fireEvent.click(
        within(screen.getByRole('radiogroup', { name: 'Studio tabs' })).getByRole('radio', {
            name,
        }),
    );

beforeEach(async () => {
    prev = useStore.getState().canvas;
    canvas = createFakeCanvas();
    useStore.setState({ canvas, characterStudioOpen: false, studioCharacter: null } as any);
    await characterStorage.saveDraft(undefined);
});
afterEach(() => {
    cleanup();
    useStore.setState({ canvas: prev, characterStudioOpen: false, studioCharacter: null } as any);
});

async function openMeera() {
    render(<CharactersPanel />);
    fireEvent.click(screen.getByRole('button', { name: /^Meera/ }));
    await waitFor(() => expect(useStore.getState().characterStudioOpen).toBe(true));
    cleanup();
    render(<CharacterStudio />);
}

describe('Character Studio', () => {
    it('opens from the cast with that person, drawn and named', async () => {
        await openMeera();
        expect(studio()).toBeTruthy();
        // new characters start in the relaxed manga idle
        expect(screen.getByRole('img', { name: 'Meera, relaxed idle' })).toBeTruthy();
        expect(
            (screen.getByRole('textbox', { name: 'Character name' }) as HTMLInputElement).value,
        ).toBe('Meera');
    });

    it('body sliders, poses and the camera change the character; undo with the keyboard', async () => {
        await openMeera();
        fireEvent.change(screen.getByRole('slider', { name: 'Age' }), { target: { value: '70' } });
        expect(useStore.getState().studioCharacter!.body.age).toBe(70);

        tab('Poses');
        fireEvent.change(screen.getByRole('textbox', { name: 'Search poses' }), {
            target: { value: 'wave' },
        });
        const wave = screen.getByRole('button', { name: 'Wave' });
        fireEvent.click(wave);
        expect(useStore.getState().studioCharacter!.rig.pose.id).toBe('wave');
        expect(screen.getByRole('button', { name: 'Wave' }).getAttribute('aria-pressed')).toBe(
            'true',
        );
        expect(screen.getByRole('img', { name: 'Meera, wave' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Side' }));
        expect(useStore.getState().studioCamera.yaw).toBe(90);

        fireEvent.keyDown(studio(), { key: 'z', code: 'KeyZ', ctrlKey: true });
        expect(useStore.getState().studioCharacter!.rig.pose.id).toBe('manga-idle');
        fireEvent.keyDown(studio(), { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true });
        expect(useStore.getState().studioCharacter!.rig.pose.id).toBe('wave');
    });

    it('pressing a part selects it (shown in the Selected part panel)', async () => {
        await openMeera();
        const torso = document.querySelector('svg[role="img"] path[data-part="torso"]')!;
        fireEvent.pointerDown(torso);
        expect(useStore.getState().studioSelectedPart).toBe('torso');
        expect(screen.getByRole('combobox', { name: 'Part' })).toHaveTextContent('Torso');
    });

    it('Place on page puts the character on the board and closes the studio; Esc closes too', async () => {
        await openMeera();
        fireEvent.click(screen.getByRole('button', { name: 'Place on page' }));
        await waitFor(() => expect(canvas.getObjects()).toHaveLength(1));
        await waitFor(() => expect(useStore.getState().characterStudioOpen).toBe(false));
        expect(canvas.getObjects()[0].characterData.character.name).toBe('Meera');

        await act(async () => {
            await useStore.getState().openCharacterStudio();
        });
        cleanup();
        render(<CharacterStudio />);
        // the placed character is selected: the studio edits it
        expect(screen.getByRole('button', { name: 'Update on page' })).toBeTruthy();
        fireEvent.keyDown(studio(), { key: 'Escape' });
        expect(useStore.getState().characterStudioOpen).toBe(false);
    });
});

// fate-reviewer findings (2026-11-18)
describe('Character Studio fixes', () => {
    it('the name takes spaces and can be emptied while typing (P1)', async () => {
        await openMeera();
        const name = screen.getByRole('textbox', { name: 'Character name' }) as HTMLInputElement;
        fireEvent.change(name, { target: { value: 'Mary ' } });
        expect(name.value).toBe('Mary ');
        fireEvent.change(name, { target: { value: 'Mary Jane' } });
        expect(name.value).toBe('Mary Jane');
        fireEvent.change(name, { target: { value: '' } });
        expect(name.value).toBe('');
    });

    it('a custom colour is picked inside the studio, for a part and in Look (P1)', async () => {
        await openMeera();
        fireEvent.pointerDown(document.querySelector('svg[role="img"] path[data-part="torso"]')!);
        fireEvent.click(screen.getByRole('button', { name: 'Torso: top colour' }));
        const picker = screen.getByRole('dialog', { name: 'Custom color' });
        const hex = within(picker).getByRole('textbox', { name: 'Hex' });
        fireEvent.change(hex, { target: { value: '#123456' } });
        fireEvent.keyDown(hex, { key: 'Enter' });
        expect(useStore.getState().studioCharacter!.dress.top.color).toBe('#123456');

        // Esc in the picker closes the picker, not the studio
        fireEvent.keyDown(hex, { key: 'Escape' });
        expect(useStore.getState().characterStudioOpen).toBe(true);
    });

    it('elders can stand upright (P3)', async () => {
        await openMeera();
        fireEvent.click(screen.getByRole('switch', { name: 'Stoop with age' }));
        expect(useStore.getState().studioCharacter!.body.overridden).toContain('posture');
    });
});

describe('art styles', () => {
    it('the Art style menu restyles the character and changes nothing else', async () => {
        await openMeera();
        const before = useStore.getState().studioCharacter!;
        fireEvent.click(screen.getByRole('combobox', { name: 'Art style' }));
        fireEvent.click(screen.getByRole('option', { name: 'Manga B/W' }));
        const after = useStore.getState().studioCharacter!;
        expect(after.style).toBe('manga');
        expect({ ...after, style: before.style }).toEqual(before);
        // manga screentone is a pattern in the studio view
        expect(document.querySelector('pattern')).not.toBeNull();
        expect(document.querySelector('path[fill^="url(#"]')).not.toBeNull();
    });
});

describe('face tab', () => {
    it('picks an emotion, sets its strength, looks aside, shuts the eyes and speaks a mouth shape; undo steps back', async () => {
        await openMeera();
        tab('Face');
        fireEvent.click(screen.getByRole('button', { name: 'Surprised' }));
        const c = () => useStore.getState().studioCharacter!;
        expect(c().emotion).toEqual({ id: 'surprised', intensity: 1 });
        expect(screen.getByRole('button', { name: 'Surprised' }).getAttribute('aria-pressed')).toBe(
            'true',
        );
        fireEvent.change(screen.getByRole('slider', { name: /Strength/ }), {
            target: { value: '40' },
        });
        expect(c().emotion.intensity).toBeCloseTo(0.4);
        fireEvent.change(screen.getByRole('slider', { name: /Look left \/ right/ }), {
            target: { value: '60' },
        });
        expect(c().face.gaze.x).toBeCloseTo(0.6);
        fireEvent.change(screen.getByRole('slider', { name: /Eyes closed/ }), {
            target: { value: '100' },
        });
        expect(c().face.blink).toBe(1);
        expect(screen.queryByRole('img', { name: /Meera/ })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Look straight ahead' }));
        expect(c().face.gaze).toEqual({ x: 0, y: 0 });
        fireEvent.click(screen.getByRole('button', { name: 'Neutral' }));
        expect(c().emotion.intensity).toBe(0);
        act(() => useStore.getState().studioUndo());
        expect(c().emotion.id).toBe('surprised');
    });
});

describe('cast browser', () => {
    it('shows 100 people a page at a time, filters by age, look and search, and starts from one', async () => {
        await openMeera();
        tab('Cast');
        expect(screen.getByText('Cast (100)')).toBeTruthy();
        const cards = () => screen.getAllByTitle(/^Start from /);
        expect(cards()).toHaveLength(24);
        fireEvent.click(screen.getByRole('button', { name: /Show more \(76 left\)/ }));
        expect(cards()).toHaveLength(48);

        fireEvent.click(screen.getByRole('button', { name: 'Elders' }));
        const elders = cards().length;
        expect(elders).toBeGreaterThanOrEqual(12);
        expect(elders).toBeLessThan(48);
        fireEvent.click(screen.getByRole('button', { name: 'Feminine' }));
        expect(cards().length).toBeLessThan(elders + 1);

        fireEvent.click(screen.getByRole('button', { name: 'All ages' }));
        fireEvent.click(screen.getByRole('button', { name: 'Any look' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Search the cast' }), {
            target: { value: 'kabir' },
        });
        expect(cards()).toHaveLength(1);
        fireEvent.click(cards()[0]);
        expect(useStore.getState().studioCharacter!.name).toBe('Kabir');
        fireEvent.change(screen.getByRole('textbox', { name: 'Search the cast' }), {
            target: { value: 'zzzz' },
        });
        expect(screen.getByText('Nobody matches.')).toBeTruthy();
    });
});

describe('hair', () => {
    it('picks one of 46 styles; two-tone is offered only where the style has length', async () => {
        await openMeera();
        // trans lists every item (a male or female identity hides the few gendered ones)
        useStore.getState().editStudioCharacter({ identity: 'trans' });
        tab('Look');
        const c = () => useStore.getState().studioCharacter!;
        fireEvent.click(screen.getByRole('combobox', { name: 'Hair style' }));
        expect(screen.getAllByRole('option')).toHaveLength(46);
        fireEvent.click(screen.getByRole('option', { name: 'Tied up: High ponytail' }));
        expect(c().hair.style).toBe('ponytail-high');
        const toggle = screen.getByRole('switch', { name: /Two-tone hair/ });
        fireEvent.click(toggle);
        expect(c().hair.tip).toBe('#3a4fb8');
        expect(screen.getByRole('group', { name: 'Tip colour' })).toBeTruthy();
        fireEvent.click(screen.getByRole('combobox', { name: 'Hair style' }));
        fireEvent.click(screen.getByRole('option', { name: 'Short: Buzz cut' }));
        expect(screen.getByRole('switch', { name: /Two-tone hair/ }).hasAttribute('disabled')).toBe(
            true,
        );
        expect(screen.queryByRole('group', { name: 'Tip colour' })).toBeNull();
    });
});

describe('identity and body type', () => {
    it('male or female in one click sets the frame; the bust follows the frame until set by hand; trans keeps the body', async () => {
        await openMeera();
        const c = () => useStore.getState().studioCharacter!;
        const who = screen.getByRole('radiogroup', { name: 'Identity' });
        fireEvent.click(within(who).getByRole('radio', { name: 'Male' }));
        expect([c().identity, c().body.gender, c().body.bust]).toEqual(['male', 0, 0]);
        fireEvent.click(within(who).getByRole('radio', { name: 'Female' }));
        expect([c().identity, c().body.gender, c().body.bust]).toEqual(['female', 1, 1]);
        // a female frame with a flat chest: the bust is set by hand and stays when the frame moves
        fireEvent.change(screen.getByRole('slider', { name: 'Bust' }), { target: { value: '0' } });
        expect(c().body.bust).toBe(0);
        fireEvent.change(screen.getByRole('slider', { name: 'Frame' }), {
            target: { value: '80' },
        });
        expect([c().body.gender, c().body.bust]).toEqual([0.8, 0]);
        // trans: the identity changes, the body as it is
        fireEvent.click(within(who).getByRole('radio', { name: 'Trans' }));
        expect([c().identity, c().body.gender, c().body.bust]).toEqual(['trans', 0.8, 0]);
    });

    it('a body type sets the build in its male or female version and shows as chosen', async () => {
        await openMeera();
        const c = () => useStore.getState().studioCharacter!;
        fireEvent.click(
            within(screen.getByRole('radiogroup', { name: 'Identity' })).getByRole('radio', {
                name: 'Male',
            }),
        );
        const types = screen.getByRole('group', { name: 'Body type' });
        fireEvent.click(within(types).getByRole('button', { name: 'Athletic' }));
        expect(c().body.muscle).toBeCloseTo(0.68);
        expect(within(types).getByRole('button', { name: 'Athletic' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        fireEvent.click(
            within(screen.getByRole('radiogroup', { name: 'Identity' })).getByRole('radio', {
                name: 'Female',
            }),
        );
        fireEvent.click(within(types).getByRole('button', { name: 'Athletic' }));
        expect(c().body.muscle).toBeCloseTo(0.56);
    });

    it('the lists show what the identity can wear; trans lists everything; a worn item stays', async () => {
        await openMeera();
        const who = (name: string) =>
            fireEvent.click(
                within(screen.getByRole('radiogroup', { name: 'Identity' })).getByRole('radio', {
                    name,
                }),
            );
        const optionsOf = (name: string) => {
            fireEvent.click(screen.getByRole('combobox', { name }));
            const list = screen.getAllByRole('option').map((o) => o.textContent);
            fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
            return list;
        };
        who('Male');
        useStore.getState().editStudioCharacter({ bottom: { kind: 'pants' } });
        tab('Look');
        expect(optionsOf('Bottom')).not.toContain('Skirt');
        expect(optionsOf('Hair style')).toContain('Long: Long');
        tab('Wardrobe');
        expect(optionsOf('Shoes')).not.toContain('Heels');
        expect(screen.queryByRole('switch', { name: /^Bindi/ })).toBeNull();
        expect(screen.getByRole('switch', { name: /^Earrings/ })).toBeInTheDocument();
        tab('Body');
        who('Trans');
        tab('Look');
        expect(optionsOf('Bottom')).toContain('Skirt');
        // a male character already in a skirt: it stays listed
        tab('Body');
        who('Male');
        useStore.getState().editStudioCharacter({ bottom: { kind: 'skirt' } });
        tab('Look');
        expect(optionsOf('Bottom')).toContain('Skirt');
    });
});

describe('effects', () => {
    it('wind with a direction, updraft, twirl and wet; clear takes them all off', async () => {
        await openMeera();
        tab('Effects');
        const c = () => useStore.getState().studioCharacter!;
        fireEvent.change(screen.getByRole('slider', { name: 'Wind' }), { target: { value: '70' } });
        fireEvent.click(
            within(screen.getByRole('radiogroup', { name: 'Wind direction' })).getByRole('radio', {
                name: '← Left',
            }),
        );
        fireEvent.change(screen.getByRole('slider', { name: 'Wet' }), { target: { value: '40' } });
        expect(c().effects).toMatchObject({ wind: 0.7, windDir: 180, wet: 0.4, twirl: 0 });
        fireEvent.click(screen.getByRole('button', { name: 'Clear effects' }));
        expect(c().effects).toBeUndefined();
        expect(screen.getByRole('button', { name: 'Clear effects' })).toBeDisabled();
    });
});

describe('manga look', () => {
    it('manga eye shapes, eyelashes, the hime cut and an ahoge are one click each', async () => {
        await openMeera();
        tab('Look');
        const c = () => useStore.getState().studioCharacter!;
        expect(c().style).toBe('anime');
        fireEvent.click(screen.getByRole('combobox', { name: 'Eyes' }));
        fireEvent.click(screen.getByRole('option', { name: 'Sparkle (big)' }));
        expect(c().face.eyeStyle).toBe('sparkle');
        const lashes = screen.getByRole('switch', { name: /Eyelashes/ });
        const had = c().face.lashes;
        fireEvent.click(lashes);
        expect(c().face.lashes).toBe(!had);
        fireEvent.click(screen.getByRole('combobox', { name: 'Hair style' }));
        fireEvent.click(screen.getByRole('option', { name: /Hime cut/ }));
        expect(c().hair.style).toBe('hime');
        fireEvent.click(screen.getByRole('switch', { name: /Ahoge/ }));
        expect(c().hair.ahoge).toBe(true);
    });
});

describe('clothes', () => {
    it('offers 51 tops and 42 bottoms by name, and the character wears the pick', async () => {
        await openMeera();
        // trans lists every item (a male or female identity hides the few gendered ones)
        useStore.getState().editStudioCharacter({ identity: 'trans' });
        tab('Look');
        const c = () => useStore.getState().studioCharacter!;
        fireEvent.click(screen.getByRole('combobox', { name: 'Top' }));
        expect(screen.getAllByRole('option')).toHaveLength(51);
        fireEvent.click(screen.getByRole('option', { name: 'Hoodie' }));
        expect(c().dress.top.kind).toBe('hoodie');
        fireEvent.click(screen.getByRole('combobox', { name: 'Bottom' }));
        expect(screen.getAllByRole('option')).toHaveLength(42);
        fireEvent.click(screen.getByRole('option', { name: 'Wide trousers' }));
        expect(c().dress.bottom.kind).toBe('wide-pants');
        expect(screen.getByRole('img', { name: /Meera/ })).toBeTruthy();
    });
});

describe('wardrobe', () => {
    it('wears an outfit, picks shoes, toggles accessories and explains what does not go together', async () => {
        await openMeera();
        tab('Wardrobe');
        const c = () => useStore.getState().studioCharacter!;
        fireEvent.click(screen.getByRole('combobox', { name: 'School outfit' }));
        fireEvent.click(screen.getByRole('option', { name: 'School skirt' }));
        expect(c().dress.top.kind).toBe('school-shirt');
        expect(c().dress.accessories.map((a) => a.kind)).toContain('backpack');
        fireEvent.click(screen.getByRole('combobox', { name: 'Shoes' }));
        fireEvent.click(screen.getByRole('option', { name: 'Boots' }));
        expect(c().dress.shoes.kind).toBe('boots');
        fireEvent.click(screen.getByRole('switch', { name: /^Glasses/ }));
        expect(c().dress.accessories.map((a) => a.kind)).toContain('glasses');
        fireEvent.click(screen.getByRole('switch', { name: /^Cap/ }));
        fireEvent.click(screen.getByRole('switch', { name: /^Beanie/ }));
        const heads = c().dress.accessories.filter((a) => ['cap', 'beanie'].includes(a.kind));
        expect(heads.map((a) => a.kind)).toEqual(['beanie']);
    });

    it('puts something in a hand; a two-hand item takes both', async () => {
        await openMeera();
        tab('Wardrobe');
        const c = () => useStore.getState().studioCharacter!;
        fireEvent.click(screen.getByRole('combobox', { name: 'Right hand holds' }));
        fireEvent.click(screen.getByRole('option', { name: 'Katana' }));
        expect(c().dress.held).toEqual([{ kind: 'katana', hand: 'R' }]);
        fireEvent.click(screen.getByRole('combobox', { name: 'Left hand holds' }));
        fireEvent.click(screen.getByRole('option', { name: 'Torch' }));
        expect(c().dress.held).toHaveLength(2);
        fireEvent.click(screen.getByRole('combobox', { name: 'Both hands hold' }));
        fireEvent.click(screen.getByRole('option', { name: 'Rifle' }));
        expect(c().dress.held).toEqual([{ kind: 'rifle', hand: 'both' }]);
    });
});

describe('body style', () => {
    it('new characters are manga; switches to classic and back; the variant shows only for manga; both side by side', async () => {
        await openMeera();
        const c = () => useStore.getState().studioCharacter!;
        expect(c().body.bodyStyle).toBe('manga');
        expect(screen.getByRole('combobox', { name: 'Manga variant' })).toBeTruthy();
        expect(screen.getByRole('group', { name: 'Classic and manga side by side' })).toBeTruthy();
        fireEvent.click(screen.getByRole('combobox', { name: 'Manga variant' }));
        fireEvent.click(screen.getByRole('option', { name: /Webtoon/ }));
        expect(c().body.mangaVariant).toBe('webtoon');
        fireEvent.click(screen.getByRole('radio', { name: 'Classic' }));
        expect(c().body.bodyStyle).toBe('classic');
        expect(screen.queryByRole('combobox', { name: 'Manga variant' })).toBeNull();
        expect(c().hair.style).toBe('long');
        // the plain stand becomes the relaxed manga idle when you go back to manga
        fireEvent.click(screen.getByRole('radio', { name: 'Manga' }));
        expect(c().body.bodyStyle).toBe('manga');
        expect(c().rig.pose.id).toBe('manga-idle');
    });
});
