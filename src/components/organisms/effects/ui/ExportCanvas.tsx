import { useStore } from '@/store';
import React, { useState, useEffect } from 'react';
import * as fabric from 'fabric';
import DockTemplate from '@/components/templates/Dock.template';
import Dropdown from '@/components/atoms/Dropdown';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import SettingRow from '@/components/molecules/SettingRow';

const Format = [
    { key: 1, value: 'jpeg', label: 'JPEG' },
    { key: 1, value: 'svg', label: 'SVG' },
    { key: 1, value: 'png', label: 'PNG' },
    { key: 1, value: 'json', label: 'JSON' },
];

// <option value="png">PNG</option>
// <option value="jpeg">JPEG</option>
// <option value="svg">SVG</option>
// <option value="json">JSON</option>

const ExportCanvas = () => {
    const canvas = useStore((s) => s.canvas);

    const [width, setWidth] = useState(400);
    const [height, setHeight] = useState(300);
    const [fileName, setFileName] = useState('drawing');
    const [format, setFormat] = useState('png');
    const [preview, setPreview] = useState('');

    // Update preview
    const updatePreview = async () => {
        if (!canvas) return;

        try {
            // Export at original size, then scale in preview
            const dataURL = canvas.toDataURL({
                format: 'png',
                quality: 1,
            });

            setPreview(dataURL);
        } catch (err) {
            console.error('Preview generation failed:', err);
        }
    };

    useEffect(() => {
        updatePreview();
    }, [canvas, width, height]);

    const handleExport = async () => {
        if (!canvas) return alert('Canvas not ready');

        let blob;

        try {
            if (format === 'png' || format === 'jpeg') {
                // Wait for all images to load
                const images = canvas.getObjects('image');
                await Promise.all(
                    images.map(
                        (img) =>
                            new Promise((resolve) => {
                                const el = img._element;
                                if (!el) return resolve();
                                if (el.complete && el.naturalWidth !== 0) return resolve();
                                el.onload = () => resolve();
                                el.onerror = () => resolve();
                            }),
                    ),
                );

                // Create temporary canvas element for resizing
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const ctx = tempCanvas.getContext('2d');

                // Get original canvas as image
                const dataURL = canvas.toDataURL({
                    format: format,
                    quality: 1,
                });

                // Load and draw scaled
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = dataURL;
                });

                // Calculate scaling to fit
                const scaleX = width / canvas.width;
                const scaleY = height / canvas.height;
                const scale = Math.min(scaleX, scaleY);

                const scaledWidth = canvas.width * scale;
                const scaledHeight = canvas.height * scale;
                const x = (width - scaledWidth) / 2;
                const y = (height - scaledHeight) / 2;

                // Fill background (white for JPEG, transparent for PNG)
                if (format === 'jpeg') {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, width, height);
                }

                // Draw scaled image
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

                // Convert to blob
                const finalDataURL = tempCanvas.toDataURL(`image/${format}`, 1);
                const binary = atob(finalDataURL.split(',')[1]);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
                blob = new Blob([array], { type: `image/${format}` });
            } else if (format === 'svg') {
                const svg = canvas.toSVG({
                    width: width + 'px',
                    height: height + 'px',
                });
                blob = new Blob([svg], { type: 'image/svg+xml' });
            } else if (format === 'json') {
                const json = JSON.stringify(canvas.toJSON(), null, 2);
                blob = new Blob([json], { type: 'application/json' });
            }

            if (blob) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${fileName}.${format}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed: ' + err.message);
        }
    };

    return (
        <DockTemplate
            title="Export"
            actions={
                // <button className="px-2 py-1 text-xs bg-blue-500 text-white rounded">
                //   Export
                // </button>
                <Button className="w-full mt-2" onClick={handleExport}>
                    Export
                </Button>
            }
        >
            <Input
                label="File Name"
                value={fileName}
                placeholder="File Name"
                onChange={(e) => {
                    setFileName(e.target.value);
                }}
            />

            <SettingRow label="Format">
                <Dropdown
                    options={Format}
                    value={format}
                    onChange={(selected) => {
                        setFormat(selected);
                    }}
                    className="w-full"
                />
            </SettingRow>

            <Input
                label="Height"
                placeholder="Height"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
            />

            <Input
                label="Width"
                placeholder="Width"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
            />

            <div className="border border-gray-300 focus:border-blue-500 h-40 w-full flex justify-center items-center bg-gray-50">
                {preview ? (
                    <img
                        src={preview}
                        alt="Preview"
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                    />
                ) : (
                    <span className="text-gray-400">Preview</span>
                )}
            </div>
        </DockTemplate>

        // <div className="flex flex-col gap-4 p-2">
        //     <div className="flex justify-between border border-stone-200 p-2 rounded-md">
        //         <h3 className="text-lg font-medium">Export</h3>

        //         <div>
        //             <input
        //                 type="number"
        //                 value={width}
        //                 onChange={(e) => setWidth(Number(e.target.value))}
        //                 placeholder="Width"
        //                 className="border p-1 rounded w-1/2"
        //             />
        //         </div>
        //     </div>
        // </div>

        // <div className="p-4 border rounded-md w-96 bg-white shadow-md space-y-4">
        //   <div className="flex gap-2">
        //     <input
        //       type="number"
        //       value={width}
        //       onChange={(e) => setWidth(Number(e.target.value))}
        //       placeholder="Width"
        //       className="border p-1 rounded w-1/2"
        //     />
        //     <input
        //       type="number"
        //       value={height}
        //       onChange={(e) => setHeight(Number(e.target.value))}
        //       placeholder="Height"
        //       className="border p-1 rounded w-1/2"
        //     />
        //   </div>

        //   <div className="border h-40 w-full flex justify-center items-center bg-gray-50">
        //     {preview ? (
        //       <img
        //         src={preview}
        //         alt="Preview"
        //         style={{ maxWidth: '100%', maxHeight: '100%' }}
        //       />
        //     ) : (
        //       <span className="text-gray-400">Preview</span>
        //     )}
        //   </div>

        //   <input
        //     type="text"
        //     value={fileName}
        //     onChange={(e) => setFileName(e.target.value)}
        //     placeholder="File Name"
        //     className="border p-1 rounded w-full"
        //   />

        //   <select
        //     value={format}
        //     onChange={(e) => setFormat(e.target.value)}
        //     className="border p-1 rounded w-full"
        //   >
        //     <option value="png">PNG</option>
        //     <option value="jpeg">JPEG</option>
        //     <option value="svg">SVG</option>
        //     <option value="json">JSON</option>
        //   </select>

        //   <button
        //     onClick={handleExport}
        //     className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        //   >
        //     Export
        //   </button>
        // </div>
    );
};

export default ExportCanvas;
