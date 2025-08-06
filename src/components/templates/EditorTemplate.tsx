const EditorTemplate = ({
    sidebar,
    propertiesPanel,
    canvasBoard,
    layers
}) => {
    return (
      <div className="flex flex-row border bg-stone-300 w-full h-screen mx-auto justify-center items-center relative">
        {sidebar}
        {propertiesPanel}
        {canvasBoard}
        {layers}
      </div>
    );
};

export default EditorTemplate;
