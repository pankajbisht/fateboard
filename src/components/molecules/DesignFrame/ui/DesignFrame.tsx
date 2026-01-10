import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { TopRuler } from './TopRuler';
import { LeftRuler } from './LeftRuler';
import { OriginCross } from './OriginCross';

type EditorCoords = { x: number; y: number };

type EditorContextType = {
    mouse: EditorCoords;
};

const EditorContext = React.createContext<EditorContextType>(null!);
export const useEditor = () => React.useContext(EditorContext);

const RULER = 32;
const CANVAS_SIZE = 2000;

export function DesignFrame({ children }: { children: ReactNode }) {
    // const viewportRef = useRef<HTMLDivElement>(null);
    // const scrollRef = useRef<HTMLDivElement>(null);

    // const topRulerRef = useRef<any>(null);
    // const leftRulerRef = useRef<any>(null);

    // const [mouse, setMouse] = useState<EditorCoords>({ x: 0, y: 0 });
    // const raf = useRef<number | null>(null);

    // const handleMouseMove = (e: React.MouseEvent) => {
    //   if (raf.current) return;

    //   raf.current = requestAnimationFrame(() => {
    //     raf.current = null;

    //     const viewport = viewportRef.current!;
    //     const scroll = scrollRef.current!;

    //     const rect = viewport.getBoundingClientRect();

    //     const x =
    //       e.clientX -
    //       rect.left +
    //       scroll.scrollLeft -
    //       CANVAS_SIZE / 2;

    //     const y =
    //       e.clientY -
    //       rect.top +
    //       scroll.scrollTop -
    //       CANVAS_SIZE / 2;

    //     setMouse({
    //       x: Math.round(x),
    //       y: Math.round(y),
    //     });
    //   });
    // };

    // useEffect(() => {
    //   const el = scrollRef.current!;
    //   const onScroll = () => {
    //     topRulerRef.current?.setScroll(el.scrollLeft);
    //     leftRulerRef.current?.setScroll(el.scrollTop);
    //   };

    //   el.addEventListener("scroll", onScroll);
    //   return () => el.removeEventListener("scroll", onScroll);
    // }, []);

    const RULER = 32;

    return (
        <section
            className="relative overflow-hidden bg-[#1b1b1b]"
            style={{
                height: 'calc(100vh - 81px - 57px)',
                width: 'calc(100vw - 30px)',
            }}
        >
            {/* RULERS (fixed overlay) */}
            <TopRuler />
            <LeftRuler />

            {/* SCROLL CONTAINER */}
            <div id="design-scroll" className="absolute inset-0 overflow-auto">
                {/* LARGE VIRTUAL SPACE */}
                <div className="relative w-[5000px] h-[5000px]">
                    {/* CENTER + SCALE */}
                    <div
                        className="absolute left-1/2 top-1/2 origin-center"
                        style={{
                            transform: `translate(-50%, -50%) scale(var(--zoom, 1))`,
                        }}
                    >
                        {children}
                    </div>
                </div>
            </div>
        </section>

        // <section
        //   className="relative bg-pink-500 overflow-auto"
        //   // style={{
        //   //   height: 'calc(100vh - 81px - 57px)',
        //   //   width: 'calc(100vw - 30px)',
        //   //   // padding: '100px'
        //   // }}
        // >
        //   {/* Top Ruler */}
        //   <div
        //     className="absolute top-0 left-[32px] right-0 h-[32px] z-20"
        //   >
        //     <TopRuler />
        //   </div>

        //   {/* Left Ruler */}
        //   <div
        //     className="absolute top-[32px] left-0 bottom-0 w-[32px] z-20"
        //   >
        //     <LeftRuler />
        //   </div>

        //   {/* Canvas Scroll Area */}
        //   <div
        //     id="design-scroll"
        //     className="absolute top-[32px] left-[32px] right-0 bottom-0 overflow-auto"
        //   >
        //     {children}
        //   </div>
        // </section>

        //   <EditorContext.Provider value={{ mouse }}>
        //     <div className="w-screen h-screen bg-[#1e1e1e]">
        //       <div
        //         className="grid h-full"
        //         style={{
        //           gridTemplateColumns: `${RULER}px 1fr`,
        //           gridTemplateRows: `${RULER}px 1fr`,
        //         }}
        //       >
        //         {/* Corner */}
        //         <div className="bg-[#2a2a2a]" />

        //         {/*<TopRuler />
        //         <LeftRuler />*/}

        //         <TopRuler ref={topRulerRef} />
        //         <LeftRuler ref={leftRulerRef} />

        //         {/* Fixed viewport */}
        //         <div
        //           ref={viewportRef}
        //           className="relative bg-[#1b1b1b] overflow-hidden h-full"
        //           onMouseMove={handleMouseMove}
        //         >
        //           {/* Scroll layer */}
        //           <div
        //             ref={scrollRef}
        //             className="absolute inset-0 overflow-auto overscroll-none will-change-scroll"
        //           >
        //             <div
        //               className="relative"
        //               style={{
        //                 width: CANVAS_SIZE,
        //                 height: CANVAS_SIZE,
        //               }}
        //             >
        //               <OriginCross />
        //               {children}
        //             </div>
        //           </div>
        //         </div>
        //       </div>
        //     </div>
        //   </EditorContext.Provider>
    );
}
