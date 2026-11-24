/**
 * Transform row fields (ShapeToolsHeader). `min` keeps sizes positive (in px). `length` fields are
 * shown in Settings > Units and stored in px (BUG-082); rotation is always degrees.
 */
export const transformFieldsConfig = [
    { key: 'x', label: 'X', name: 'X', length: true },
    { key: 'y', label: 'Y', name: 'Y', length: true },
    { key: 'width', label: 'W', name: 'Width', min: 1, length: true },
    { key: 'height', label: 'H', name: 'Height', min: 1, length: true },
    { key: 'rotation', label: 'R', name: 'Rotation', unit: '°', min: -360, max: 360 },
] as const;
