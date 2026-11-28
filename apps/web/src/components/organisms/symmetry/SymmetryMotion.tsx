import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import type { SymmetryAnimEffect } from '@/store/slices/symmetry/symmetryAnimation';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { SliderField } from '../../molecules/LabeledSlider';

/**
 * Animated symmetry: spin / pulse / swirl of the linked patterns, speed and strength, sound-reactive (microphone
 * or a music file; asks only when pressed), and a seamless looping GIF of one period.
 */
export function SymmetryMotion() {
    const s = useStore(
        useShallow((st) => ({
            anim: st.symmetryAnim,
            setAnim: st.setSymmetryAnim,
            playing: st.symmetryAnimating,
            play: st.playSymmetryAnimation,
            stop: st.stopSymmetryAnimation,
            sound: st.symmetrySound,
            listen: st.listenSymmetrySound,
            exportLoop: st.exportSymmetryLoop,
        })),
    );
    const file = useRef<HTMLInputElement>(null);
    return (
        <div className="flex flex-col gap-2">
            <SegmentedControl<SymmetryAnimEffect>
                aria-label="Animation"
                value={s.anim.effect}
                onChange={(effect) => s.setAnim({ effect })}
                options={[
                    { value: 'spin', label: 'Spin' },
                    { value: 'pulse', label: 'Pulse' },
                    { value: 'swirl', label: 'Swirl' },
                ]}
            />
            <SliderField
                label="Loop length"
                min={1}
                max={20}
                unit="s"
                value={s.anim.period}
                defaultValue={4}
                onChange={(period) => s.setAnim({ period })}
            />
            <SliderField
                label="Strength"
                min={0}
                max={100}
                unit="%"
                value={Math.round(s.anim.amount * 100)}
                defaultValue={50}
                onChange={(v) => s.setAnim({ amount: v / 100 })}
            />
            <div className="flex flex-wrap gap-1">
                {s.playing ? (
                    <Button size="sm" variant="primary" onClick={() => s.stop()}>
                        <Icon name="stop" />
                        Stop
                    </Button>
                ) : (
                    <Button size="sm" variant="primary" onClick={() => s.play()}>
                        <Icon name="play" />
                        Play
                    </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => void s.exportLoop()}>
                    <Icon name="download" />
                    Export looping GIF
                </Button>
            </div>
            <p className="text-xs text-ink-muted">
                Moves linked copies. Clicking the board stops it; nothing is saved while it plays.
            </p>
            <span className="text-xs font-medium text-ink-muted">React to sound</span>
            <div className="flex flex-wrap gap-1" role="group" aria-label="React to sound">
                <Button
                    size="sm"
                    variant={s.sound === 'mic' ? 'primary' : 'secondary'}
                    aria-pressed={s.sound === 'mic'}
                    onClick={() => void s.listen(s.sound === 'mic' ? 'off' : 'mic')}
                >
                    <Icon name="waves" />
                    {s.sound === 'mic' ? 'Stop the microphone' : 'Use the microphone'}
                </Button>
                <Button
                    size="sm"
                    variant={s.sound === 'file' ? 'primary' : 'secondary'}
                    aria-pressed={s.sound === 'file'}
                    onClick={() =>
                        s.sound === 'file' ? void s.listen('off') : file.current?.click()
                    }
                >
                    <Icon name="play" />
                    {s.sound === 'file' ? 'Stop the music' : 'Play a music file…'}
                </Button>
                <input
                    ref={file}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    aria-label="Music file"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void s.listen('file', f);
                        e.target.value = '';
                    }}
                />
            </div>
        </div>
    );
}
