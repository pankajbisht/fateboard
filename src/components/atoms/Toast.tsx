import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
    message: string;
    duration?: number;
    onClose?: () => void;
}

export default function Toast({ message, duration = 2000, onClose }: ToastProps) {
    const [show, setShow] = useState(false);
    const [container] = useState(() => {
        const el = document.createElement('div');
        el.id = 'toast-portal';
        return el;
    });

    useEffect(() => {
        document.body.appendChild(container);
        return () => container.remove();
    }, [container]);

    useEffect(() => {
        setShow(true);
        const timer = setTimeout(() => {
            setShow(false);
            setTimeout(() => onClose && onClose(), 200); // wait for fade out
        }, duration);

        return () => clearTimeout(timer);
    }, []);

    const toastElement = (
        <div
            className={`fixed bottom-6 left-1/2 transform -translate-x-1/2
                  px-4 py-2 bg-gray-800 text-white text-sm rounded-md
                  shadow-lg transition-opacity duration-200
                  ${show ? 'opacity-100' : 'opacity-0'}`}
        >
            {message}
        </div>
    );

    return createPortal(toastElement, container);
}
