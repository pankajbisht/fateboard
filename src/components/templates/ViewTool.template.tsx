type ViewToolProps = {
    colorTool?: React.ReactNode;
    zoomTool?: React.ReactNode;
    strokeTool?: React.ReactNode;
};

export const ViewTool = ({ colorTool, zoomTool, strokeTool }: ViewToolProps) => {
    return (
        <div className="flex bg-white flex-col items-start px-2 py-1">
            {colorTool && <div className="flex-1 flex justify-center">{colorTool}</div>}

            <div className="flex items-center gap-2">
                {zoomTool && <div className="flex py-1">{zoomTool}</div>}
                {strokeTool && <div className="flex py-1">{strokeTool}</div>}
            </div>
        </div>
    );
};
