import { useState } from 'react';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { SceneActorsTab } from './SceneActorsTab';
import { SceneCameraTab } from './SceneCameraTab';
import { SceneFrameTab } from './SceneFrameTab';
import { SceneSetTab } from './SceneSetTab';
import { SceneTemplatesTab } from './SceneTemplatesTab';

type Tab = 'start' | 'set' | 'actors' | 'camera' | 'frame';
const TABS = [
    { value: 'start', label: 'Start' },
    { value: 'set', label: 'Place' },
    { value: 'actors', label: 'Cast' },
    { value: 'camera', label: 'Camera' },
    { value: 'frame', label: 'Frame' },
] as const;

/** The left side of the studio in Scene mode. */
export function SceneTabs() {
    const [tab, setTab] = useState<Tab>('set');
    return (
        <>
            <div className="shrink-0 p-2">
                <SegmentedControl<Tab>
                    aria-label="Scene tabs"
                    value={tab}
                    onChange={setTab}
                    options={[...TABS]}
                />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                {tab === 'start' && <SceneTemplatesTab />}
                {tab === 'set' && <SceneSetTab />}
                {tab === 'actors' && <SceneActorsTab />}
                {tab === 'camera' && <SceneCameraTab />}
                {tab === 'frame' && <SceneFrameTab />}
            </div>
        </>
    );
}

export default SceneTabs;
