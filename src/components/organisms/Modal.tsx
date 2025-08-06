import { createPortal } from "react-dom";

export const Modal = ({ onClick }) => {
    let el = document.getElementById("portal");

    return createPortal(
        <>
            <div className="fixed bg-black inset-0 opacity-50 backdrop-blue-sm">
            </div>
            <div
                onClick={onClick}
                className="flex justify-center animate-spin  fixed top-1/2 left-1/2  w-96 p-6 rounded-lg -translate-x-1/2 -translate-y-1/2">
                <i className="fa-solid fa-loader text-white text-3xl"></i>
            </div>
        </>,
        el
    )
}