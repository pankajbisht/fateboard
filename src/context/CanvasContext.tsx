//import { createContext, useContext, useRef, useState } from "react";
//
//const CanvasContext = createContext();
//
//export const CanvasProvider = ({ children }) => {
//  const canvasRef = useRef(null);
//  const [canvas, setCanvas] = useState(null);
//  const [selectedObject, setSelectedObject] = useState(null);
//
//  return (
//    <CanvasContext.Provider
//      value={{
//        canvasRef,
//        canvas,
//        setCanvas,
//        selectedObject,
//        setSelectedObject
//      }}
//    >
//      {children}
//    </CanvasContext.Provider>
//  );
//};
//
//export const useCanvasContext = () => useContext(CanvasContext);
