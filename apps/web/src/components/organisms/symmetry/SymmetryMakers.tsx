import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { Button } from '../../atoms/Button';
import { Chip } from '../../atoms/Chip';
import { Icon } from '../../atoms/Icon';
import { Input } from '../../atoms/Input';
import { SliderField } from '../../molecules/LabeledSlider';
import { SwitchField } from '../../molecules/LabeledToggle';

/** Pattern maker (seamless tile), symmetry stamps, the Time machine and the Mirror lens. */
export function SymmetryMakers() {
    const s = useStore(
        useShallow((st) => ({
            exportTile: st.exportSymmetryTile,
            stamps: st.symmetryStamps,
            armed: st.symmetryStampArmed,
            save: st.saveSymmetryStamp,
            arm: st.armSymmetryStamp,
            remove: st.deleteSymmetryStamp,
            step: st.symmetryTimeStep,
            setStep: st.setSymmetryTimeStep,
            total: st.symmetryTimeTotal,
            lens: st.symmetryLens,
            setLens: st.setSymmetryLens,
            mode: st.symmetry,
        })),
    );
    const [name, setName] = useState('');
    const total = s.step === null ? 0 : s.total();
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
                <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    onClick={() => void s.exportTile()}
                >
                    <Icon name="download" />
                    Export seamless tile (PNG)
                </Button>
                {s.mode !== 'wallpaper' && (
                    <p className="text-xs text-ink-muted">
                        Use the Wallpaper mode, draw a motif, then export.
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-end gap-1">
                    <Input
                        label="Stamp name"
                        value={name}
                        maxLength={40}
                        placeholder="My stamp"
                        onChange={(e) => setName(e.target.value)}
                        className="flex-1"
                    />
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                            if (s.save(name)) setName('');
                        }}
                    >
                        <Icon name="stamp" />
                        Save selection
                    </Button>
                </div>
                {s.stamps.length > 0 && (
                    <ul className="flex flex-col gap-1" aria-label="Symmetry stamps">
                        {s.stamps.map((st) => (
                            <li key={st.id} className="flex items-center gap-1">
                                <Chip
                                    active={s.armed === st.id}
                                    aria-pressed={s.armed === st.id}
                                    className="flex-1 justify-start"
                                    onClick={() => s.arm(s.armed === st.id ? null : st.id)}
                                >
                                    <Icon name="stamp" />
                                    {st.name}
                                </Chip>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    aria-label={`Delete ${st.name}`}
                                    onClick={() => void s.remove(st.id)}
                                >
                                    <Icon name="trash-can" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex flex-col gap-2">
                {s.step === null ? (
                    <Button
                        size="sm"
                        variant="secondary"
                        className="self-start"
                        onClick={() => s.setStep(0)}
                    >
                        <Icon name="play" />
                        Open the time machine
                    </Button>
                ) : (
                    <>
                        <SliderField
                            label="Time machine"
                            hint="Drag to replay how the design was built"
                            min={0}
                            max={Math.max(1, total)}
                            value={s.step}
                            onChange={(v) => s.setStep(v)}
                        />
                        <Button
                            size="sm"
                            variant="secondary"
                            className="self-start"
                            onClick={() => s.setStep(null)}
                        >
                            Back to now
                        </Button>
                    </>
                )}
            </div>

            <SwitchField
                label="Mirror lens"
                description="A small window that mirrors what it covers. Drag it around the board."
                checked={s.lens}
                onChange={s.setLens}
            />
        </div>
    );
}

/** Symmetry challenge: draw the missing half of a target, get a score. */
export function SymmetryChallengeSection() {
    const s = useStore(
        useShallow((st) => ({
            challenge: st.symmetryChallenge,
            start: st.startSymmetryChallenge,
            hint: st.setSymmetryChallengeHint,
            check: st.checkSymmetryChallenge,
            end: st.endSymmetryChallenge,
        })),
    );
    const c = s.challenge;
    if (!c)
        return (
            <Button size="sm" variant="primary" className="self-start" onClick={() => s.start()}>
                <Icon name="star" />
                Start a challenge
            </Button>
        );
    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-ink">
                Challenge #{c.seed}: draw the right half so it mirrors the left.
                {c.score !== null && (
                    <span role="status" className="ml-1 font-medium">
                        {c.score}% match
                    </span>
                )}
            </p>
            <SwitchField label="Show a hint" checked={c.hint} onChange={s.hint} />
            <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="primary" onClick={() => s.check()}>
                    <Icon name="check" />
                    Check
                </Button>
                <Button size="sm" variant="secondary" onClick={() => s.end()}>
                    End challenge
                </Button>
            </div>
        </div>
    );
}
