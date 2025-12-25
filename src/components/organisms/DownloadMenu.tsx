import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { IconButton } from '../atoms/IconButton.tsx';

export default function DownloadMenu({ canvas }) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    // ✅ Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const downloadCanvasAsImage = (type = 'png') => {
        if (!canvas) return;
        const dataURL = canvas.toDataURL({ format: type, quality: 1.0 });
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `canvas.${type}`;
        link.click();
    };

    const downloadCanvasAsPDF = () => {
        if (!canvas) return;
        const dataURL = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(dataURL);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(dataURL, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('canvas.pdf');
    };

    return (
        <div ref={dropdownRef} className="relative inline-block text-left">
            {/* Main IconButton */}
            <IconButton
                icon={
                    <i
                        className={`fa-solid fa-download text-lg transition ${
                            open ? 'text-blue-600' : ''
                        }`}
                    ></i>
                }
                onClick={() => setOpen(!open)}
                title="Download File"
                className={`rounded-md p-2 ${open ? 'bg-blue-100 ring-2 ring-blue-400' : ''}`}
            />

            {/* Dropdown */}
            {/*bg-stone-100 rounded-md shadow-lg w-72 p-4 z-50 transform transition-all duration-300 ease-out*/}
            {open && (
                <div className="absolute right-0 mt-1 w-28 bg-white shadow-md z-50 text-sm text-stone-800">
                    <button
                        onClick={() => {
                            downloadCanvasAsImage('png');
                            setOpen(false);
                        }}
                        className="w-full text-left px-2 py-2 hover:bg-gray-200"
                    >
                        PNG
                    </button>
                    <button
                        onClick={() => {
                            downloadCanvasAsImage('jpeg');
                            setOpen(false);
                        }}
                        className="w-full text-left px-2 py-2 hover:bg-gray-200"
                    >
                        JPEG
                    </button>
                    <button
                        onClick={() => {
                            downloadCanvasAsPDF();
                            setOpen(false);
                        }}
                        className="w-full text-left px-2 py-2 hover:bg-gray-200"
                    >
                        PDF
                    </button>
                </div>
            )}
        </div>
    );
}
