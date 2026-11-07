/** Transform row fields (ShapeToolsHeader). `min` keeps sizes positive. */
export const transformFieldsConfig = [
    { key: 'x', label: 'X', name: 'X' },
    { key: 'y', label: 'Y', name: 'Y' },
    { key: 'width', label: 'W', name: 'Width', min: 1 },
    { key: 'height', label: 'H', name: 'Height', min: 1 },
    { key: 'rotation', label: 'R', name: 'Rotation', unit: '°', min: -360, max: 360 },
] as const;
