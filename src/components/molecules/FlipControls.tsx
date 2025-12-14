const flipOptions = [
  {
    key: "flipX",
    icon: "fa-solid fa-arrows-left-right",
    tooltip: "Flip horizontally",
  },
  {
    key: "flipY",
    icon: "fa-solid fa-arrows-up-down",
    tooltip: "Flip vertically",
  },
];

function FlipControls({ canvas }) {
  const [flipState, setFlipState] = useState({
    flipX: false,
    flipY: false,
  });

  const handleFlip = (key) => {
    const obj = canvas.getActiveObject();
    if (!obj) return;

    const newState = {
      ...flipState,
      [key]: !flipState[key],
    };

    setFlipState(newState);

    obj.set({
      flipX: newState.flipX,
      flipY: newState.flipY,
    });

    canvas.requestRenderAll();
  };

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {flipOptions.map((opt) => (
        <ToolToggle
          key={opt.key}
          size={24}
          active={flipState[opt.key]}
          onChange={() => handleFlip(opt.key)}
          iconOn={opt.icon}
          iconOff={opt.icon}
          tooltip={opt.tooltip}
        />
      ))}
    </div>
  );
}
