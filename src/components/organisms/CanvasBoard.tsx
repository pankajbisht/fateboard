import ZoomDropdown from "../molecules/ZoomDropdown.tsx";
import BorderControls from "./BorderControls.tsx";
import ColorPalette from "./ColorPalette.tsx";

const CanvasBoard = ({ canvasRef, canvas }) => {
    
    return <>
        <div className="flex fixed left-0 bottom-0 right-0 px-2 pb-2 justify-between items-center">
            <BorderControls canvas={canvas}/>

            <ColorPalette canvas={canvas}/>

            <ZoomDropdown canvas={canvas} />
        </div>
        <canvas ref={canvasRef} className="z-10" />
    </>
};

  export default CanvasBoard;
