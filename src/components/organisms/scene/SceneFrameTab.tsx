import { useStore } from '@store';
import { downloadBlob } from '@/lib/export/downloadBlob';
import { svgSize, svgToPng } from '@/lib/export/svgToPng';
import { svgToPdf } from '@/lib/export/svgToPdf';
import { zip } from '@/lib/zip';
import { sceneExportFiles, slug } from '@/scene/export/layers';
import { cleanScene } from '@/scene/schema/parse';
import { ASPECTS, FRAME_SHAPES, type AspectId, type FrameShape } from '@/scene/schema/types';
import { Button } from '../../atoms/Button';
import { Select } from '../../atoms/Select';
import { SliderField } from '../../molecules/LabeledSlider';
import { PanelSection } from '../../molecules/PanelSection';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { ColorChoices } from '../character/ColorChoices';
import { ASPECT_LABELS, SHAPE_LABELS } from './sceneLabels';

const BORDER_COLORS = ['#1f1f1f', '#ffffff', '#7a5234', '#2f5d8a', '#c0392b', '#d4a017'];

/** The picture's frame: its proportions (comic panel, phone, cinema), corners and border. */
export function SceneFrameTab() {
    const frame = useStore((s) => s.studioScene?.frame);
    const scene = useStore((s) => s.studioScene);
    const edit = useStore((s) => s.editStudioScene);
    const toast = useStore((s) => s.showToast);
    if (!frame || !scene) return null;

    /** Downloads one form of the scene; a failure is a toast, never a throw. */
    const save = async (kind: 'svg' | 'png' | 'pdf' | 'zip' | 'json') => {
        try {
            const clean = cleanScene(scene);
            const files = sceneExportFiles(clean);
            const base = slug(clean.name);
            if (kind === 'pdf') {
                const svg = files.find((x) => x.name === 'composite.svg')!.data;
                const size = svgSize(svg)!;
                downloadBlob(
                    await svgToPdf(svg, size.width, size.height, clean.name),
                    `${base}.pdf`,
                );
            } else if (kind === 'png') {
                const svg = files.find((x) => x.name === 'composite.svg')!.data;
                const size = svgSize(svg)!;
                downloadBlob(await svgToPng(svg, size.width, size.height), `${base}.png`);
            } else if (kind === 'zip')
                downloadBlob(
                    new Blob([zip(files) as BlobPart], { type: 'application/zip' }),
                    `${base}.zip`,
                );
            else {
                const f = files.find(
                    (x) => x.name === (kind === 'svg' ? 'composite.svg' : 'scene.json'),
                )!;
                downloadBlob(
                    new Blob([f.data], {
                        type: kind === 'svg' ? 'image/svg+xml' : 'application/json',
                    }),
                    `${base}.${kind}`,
                );
            }
        } catch (err) {
            console.error('[scene] export failed', err);
            toast({ message: 'Could not export the scene.' });
        }
    };
    return (
        <div className="flex flex-col gap-4">
            <PanelSection title="Frame">
                <Select<AspectId>
                    aria-label="Frame shape"
                    value={frame.aspect}
                    onChange={(aspect) => edit({ kind: 'frame', patch: { aspect } })}
                    options={ASPECTS.map((x) => ({ value: x, label: ASPECT_LABELS[x] }))}
                />
                <SegmentedControl<FrameShape>
                    aria-label="Corners"
                    value={frame.shape}
                    onChange={(shape) => edit({ kind: 'frame', patch: { shape } })}
                    options={FRAME_SHAPES.map((x) => ({ value: x, label: SHAPE_LABELS[x] }))}
                />
                <SliderField
                    label="Border"
                    min={0}
                    max={40}
                    step={1}
                    value={frame.border}
                    onChange={(border) =>
                        edit({ kind: 'frame', patch: { border } }, 'frame-border')
                    }
                />
                {frame.border > 0 && (
                    <ColorChoices
                        label="Border colour"
                        colors={BORDER_COLORS}
                        value={frame.borderColor}
                        onChange={(borderColor) => edit({ kind: 'frame', patch: { borderColor } })}
                    />
                )}
            </PanelSection>
            <PanelSection
                title="Export"
                description="The layers (place, each character, frame) line up exactly in any editor."
            >
                <Button
                    variant="secondary"
                    size="sm"
                    icon="download"
                    onClick={() => void save('zip')}
                >
                    Download layers (ZIP)
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    icon="download"
                    onClick={() => void save('png')}
                >
                    Download picture (PNG)
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    icon="download"
                    onClick={() => void save('pdf')}
                >
                    Download picture (PDF)
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    icon="download"
                    onClick={() => void save('svg')}
                >
                    Download picture (SVG)
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    icon="download"
                    onClick={() => void save('json')}
                >
                    Download scene file (JSON)
                </Button>
            </PanelSection>
        </div>
    );
}

export default SceneFrameTab;
