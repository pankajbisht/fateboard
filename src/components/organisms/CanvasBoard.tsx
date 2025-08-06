import ZoomDropdown from "../molecules/ZoomDropdown.tsx";

const CanvasBoard = ({ canvasRef, canvas }) => {
    return <>
        <div className="fixed bottom-4 left-4">
            <ZoomDropdown canvas={canvas} />
        </div>
        <canvas ref={canvasRef} className="z-10" />
    </>
};

  export default CanvasBoard;
