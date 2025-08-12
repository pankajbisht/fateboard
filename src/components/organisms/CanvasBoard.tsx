import ZoomDropdown from "../molecules/ZoomDropdown.tsx";
import BorderControls from "./BorderControls.tsx";
import ColorPalette from "./ColorPalette.tsx";
import db from "opendb-store";

const CanvasBoard = ({ canvasRef, canvas }) => {
    
    const handleClick = () => {
        const savedState = canvas.toJSON(); // get JSON of canvas
        console.log(savedState);
        db.local.set('drawJson', savedState);
    }

    const clearClick = () => {
        db.local.clear();              // clear your local DB/localStorage/etc.
        canvas.clear();                 // remove all objects AND background
        canvas.backgroundColor = "#FFF"; // optional: reset background
        canvas.requestRenderAll();      // schedule re-render
      };
      

    return <>
        <div className="flex fixed left-0 bottom-0 right-0 px-2 pb-2 justify-between items-center">
            <BorderControls canvas={canvas}/>

            <ColorPalette canvas={canvas}/>

            <button onClick={handleClick} className="cursor-pointer">
                <i className="fa-solid fa-floppy-disk"></i>
            </button>

            <button onClick={clearClick} className="cursor-pointer">
                <i className="fa-solid fa-square-xmark"></i>
            </button>

            <ZoomDropdown canvas={canvas} />
        </div>
        <canvas ref={canvasRef} className="z-10" />
    </>
};

  export default CanvasBoard;
