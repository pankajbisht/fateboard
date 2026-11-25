/**
 * The poses of the owner's two reference sheets (docs/CHARACTER_STUDIO.md, reference pass), in sheet order, with the
 * camera turn each figure is drawn from. Ids not in the library yet fall back to the stand in the contact sheet.
 */
export interface ReferencePose {
    id: string;
    yaw: number;
}

/** Sheet 2: a teen boy in hoodie or T-shirt and jeans, three rows of six. */
export const FULL_BODY_REFERENCE: ReferencePose[] = [
    { id: 'pockets-hoodie', yaw: 0 },
    { id: 'pockets-side', yaw: 90 },
    { id: 'arms-crossed', yaw: 0 },
    { id: 'stand', yaw: 180 },
    { id: 'scratch-head', yaw: 20 },
    { id: 'one-pocket-lean', yaw: 15 },
    { id: 'walk-strap', yaw: 20 },
    { id: 'walk-look-up', yaw: 40 },
    { id: 'jump-fist', yaw: 10 },
    { id: 'squat-rest', yaw: 25 },
    { id: 'skateboard-ride', yaw: 25 },
    { id: 'wall-lean-crossed', yaw: 20 },
    { id: 'phone-look', yaw: 15 },
    { id: 'stretch-up', yaw: 0 },
    { id: 'strap-stand', yaw: 15 },
    { id: 'walk-away', yaw: 160 },
    { id: 'hand-on-head', yaw: 10 },
];

/** Sheet 1: hand gestures, waist up, four rows of four. */
export const GESTURE_REFERENCE: ReferencePose[] = [
    { id: 'arms-crossed', yaw: 0 },
    { id: 'thumbs-up-side', yaw: 10 },
    { id: 'thumbs-up', yaw: 0 },
    { id: 'wave', yaw: 0 },
    { id: 'hands-over-ears', yaw: 0 },
    { id: 'palm-up', yaw: 10 },
    { id: 'fists-up', yaw: 0 },
    { id: 'thinking', yaw: 0 },
    { id: 'point-side', yaw: 10 },
    { id: 'ok-sign', yaw: 0 },
    { id: 'hands-up', yaw: 0 },
    { id: 'chin-hand', yaw: 0 },
    { id: 'hold-head', yaw: 0 },
    { id: 'chin-rest', yaw: 0 },
    { id: 'finger-up', yaw: 0 },
    { id: 'arms-crossed-relaxed', yaw: 0 },
];
