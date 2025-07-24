import { useState } from 'react';

export const LeftAside = ({ tools, activeTool, setActiveTool }) => (
    <aside className="fixed left-0 top-0 h-screen w-14 flex flex-col gap-4 items-center py-4 bg-white shadow-xl z-50">
        {tools.map(tool => (
            <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`p-2 rounded-md ${activeTool === tool.id ? 'bg-blue-200' : 'hover:bg-stone-100'}`}
            >
                <span className="text-xl">{tool.icon}</span>
            </button>
        ))}
    </aside>
);


export const RightPanel = ({ tools, activeTool }) => {
    const tool = tools.find(t => t.id === activeTool);
    return (
        <aside className="fixed left-14 top-0 h-screen w-72 p-4 bg-white shadow-xl z-40 flex flex-col gap-4 rounded-l-xl">
            <h2 className="font-bold text-lg">{tool.label}</h2>
            {tool.panel}
        </aside>
    );
};


const HomePageLayout = ({ children }) => {

    const [activeTool, setActiveTool] = useState(null);

    const tools = [
        {
            id: 'move',
            icon: '🔀',
            label: 'Size & Position',
            panel: (
                <div className="flex flex-col gap-2">
                    <button className="p-2 bg-blue-500 text-white rounded">Move</button>
                    <select className="border rounded p-2">
                        <option>Layer</option>
                    </select>
                    <p className="text-gray-600">Alignment options...</p>
                </div>
            )
        },
        {
            id: 'brush',
            icon: '🖌️',
            label: 'Brush Settings',
            panel: (
                <div className="flex flex-col gap-2">
                    <input type="range" min="1" max="100" />
                    <span>Brush Size</span>
                </div>
            )
        },
        {
            id: 'crop',
            icon: '✂️',
            label: 'Crop Tool',
            panel: (
                <div className="flex flex-col gap-2">
                    <button className="p-2 bg-red-500 text-white rounded">Crop</button>
                </div>
            )
        }
    ];


    return <>
        {/*<div className="flex flex-col bg-gray-200">*/}
            {/*<header className="flex flex-row">header</header>*/}

            {/*<div className="flex flex-row h-100">*/}
                {/*<aside className="flex flex-col items-center bg-gray-50 p-2 rounded-xl m-2 shadow-md">*/}
                {/*    <div className="flex justify-center items-center py-1 px-2 text-white hover:bg-gray-200 text-gray-200 rounded-xl w-10 h-10 cursor-pointer">*/}
                {/*        <svg role="img" fill="gray" viewBox="0 0 20 20" id="-icon" width="20" height="20" aria-hidden="true" aria-label="" focusable="false"><path d="m6.28125,18.54694c-.29199,0-.58887-.05762-.87646-.17676-.85547-.35547-1.38721-1.15137-1.38721-2.07812l-.00391-12.4707c-.00049-.92773.53223-1.72461,1.38965-2.08008.85498-.35352,1.79639-.16699,2.45312.48926l8.8916,8.91406c.65479.65527.84082,1.59473.48584,2.4502-.35547.85547-1.15186,1.3877-2.07861,1.3877h-4.07861c-.19629,0-.38965.08008-.52979.21973l-2.69092,2.68262c-.43555.43457-.99658.66211-1.57471.66211Zm-.00391-15.47852c-.1377,0-.24951.03809-.30029.05957-.10889.04492-.46338.22754-.46338.69336l.00391,12.4707c0,.46484.354.64746.4624.69238.10791.04492.48682.16699.81689-.16211l2.69141-2.68262c.42529-.42383.98926-.65723,1.58838-.65723h4.07861c.46484,0,.64795-.35449.69287-.46289s.16602-.4873-.16162-.81543L6.79492,3.2901c-.17432-.17383-.3623-.22168-.51758-.22168Z" stroke-width="0"></path></svg>*/}
                {/*    </div>*/}

                {/*    <div className="flex justify-center items-center py-1 px-2 text-white rounded-xl w-10 h-10 cursor-pointer selection:text-black hover:bg-gray-200 text-gray-200">*/}
                {/*        <svg role="img" fill="gray" viewBox="0 0 20 20" id="-icon" width="20" height="20" aria-hidden="true" aria-label="" focusable="false"><path d="m6.28125,18.54694c-.29199,0-.58887-.05762-.87646-.17676-.85547-.35547-1.38721-1.15137-1.38721-2.07812l-.00391-12.4707c-.00049-.92773.53223-1.72461,1.38965-2.08008.85498-.35352,1.79639-.16699,2.45312.48926l8.8916,8.91406c.65479.65527.84082,1.59473.48584,2.4502-.35547.85547-1.15186,1.3877-2.07861,1.3877h-4.07861c-.19629,0-.38965.08008-.52979.21973l-2.69092,2.68262c-.43555.43457-.99658.66211-1.57471.66211Zm-.00391-15.47852c-.1377,0-.24951.03809-.30029.05957-.10889.04492-.46338.22754-.46338.69336l.00391,12.4707c0,.46484.354.64746.4624.69238.10791.04492.48682.16699.81689-.16211l2.69141-2.68262c.42529-.42383.98926-.65723,1.58838-.65723h4.07861c.46484,0,.64795-.35449.69287-.46289s.16602-.4873-.16162-.81543L6.79492,3.2901c-.17432-.17383-.3623-.22168-.51758-.22168Z" stroke-width="0"></path></svg>*/}
                {/*    </div>*/}

                {/*</aside>*/}

                {/*<div className="flex min-h-screen bg-stone-100">*/}
                {/*    <LeftAside tools={tools} activeTool={activeTool} setActiveTool={setActiveTool} />*/}
                {/*    <RightPanel activeTool={activeTool} tools={tools} />*/}
                {/*    <main className="flex-1 p-10 text-3xl text-gray-500 flex justify-center items-center">*/}
                {/*        Main Canvas Area*/}
                {/*    </main>*/}
                {/*</div>*/}

                {/*<div className="flex h-screen overflow-hidden">*/}
                {/*    <LeftAside tools={tools} activeTool={activeTool} setActiveTool={setActiveTool} />*/}

                {/*    {activeTool && (*/}
                {/*        <RightPanel tools={tools} activeTool={activeTool} />*/}
                {/*    )}*/}

                {/*    <main className="flex-1 overflow-auto p-6 bg-stone-100 space-y-4">*/}
                {/*        {[...Array(30)].map((_, idx) => (*/}
                {/*            <div key={idx} className="h-64 bg-white rounded-xl shadow-md flex items-center justify-center text-2xl text-gray-500">*/}
                {/*                Large Item {idx + 1}*/}
                {/*            </div>*/}
                {/*        ))}*/}
                {/*    </main>*/}
                {/*</div>*/}

                <div className="flex h-screen relative overflow-hidden">
                    <LeftAside tools={tools} activeTool={activeTool} setActiveTool={setActiveTool} />

                    {activeTool && (
                      <RightPanel tools={tools} activeTool={activeTool} />
                    )}

                    <div className="flex h-screen relative overflow-hidden">
                        <LeftAside tools={tools} activeTool={activeTool} setActiveTool={setActiveTool} />

                        {activeTool && (
                          <RightPanel tools={tools} activeTool={activeTool} />
                        )}

                        <main
                          className={`ml-14 ${activeTool ? 'mr-72' : ''} flex-1 overflow-auto bg-stone-100 h-screen`}
                        >
                          <div className="w-[3000px] h-[2000px] flex justify-center items-center">
                            <img
                              src="https://picsum.photos/3000/2000"
                              alt="Editable"
                              className="object-cover w-full h-full"
                            />
                          </div>
                        </main>
                      </div>

                    {/*<main className="flex-1 overflow-auto h-screen ml-14 mr-72 bg-stone-100">*/}
                    {/*    <div className="w-[2000px] h-[1500px] flex items-center justify-center">*/}
                    {/*      <img src="your-image.jpg" className="max-w-none" />*/}
                    {/*    </div>*/}
                    {/*  </main>*/}
                    {/*  */}


                    {/*<main*/}
                    {/*  className={`ml-14 ${activeTool ? 'mr-72' : ''} flex-1 overflow-auto bg-stone-100 p-6 h-screen`}*/}
                    {/*>*/}
                    {/*  <div className="flex flex-wrap gap-6 justify-center">*/}
                    {/*    {[...Array(10)].map((_, idx) => (*/}
                    {/*      <div*/}
                    {/*        key={idx}*/}
                    {/*        className="w-[400px] h-[300px] bg-white rounded-xl shadow flex justify-center items-center overflow-hidden"*/}
                    {/*      >*/}
                    {/*        <img*/}
                    {/*          src={`https://picsum.photos/seed/${idx}/400/300`}*/}
                    {/*          alt={`Sample ${idx + 1}`}*/}
                    {/*          className="object-cover w-full h-full"*/}
                    {/*        />*/}
                    {/*      </div>*/}
                    {/*    ))}*/}
                    {/*  </div>*/}
                    {/*</main>*/}
                  </div>

                {/*<dialog open>This is an open dialog window</dialog>*/}


                {/*<div>*/}
                {/*    <header className="flex">header</header>*/}
                {/*    <main>{ children }</main>*/}
                {/*    <footer>footer</footer>*/}
                {/*</div>*/}
                {/*            </div>< /div> */}
    </>
}

export { HomePageLayout };