const ORIGINS = {
  tl: { x: "left",   y: "top",    left: "12%", top: "12%" },
  tr: { x: "right",  y: "top",    left: "88%", top: "12%" },
  c:  { x: "center", y: "center", left: "50%", top: "50%" },
  bl: { x: "left",   y: "bottom", left: "12%", top: "88%" },
  br: { x: "right",  y: "bottom", left: "88%", top: "88%" },
};

export default function OriginSelector({
  size = 24,
  value = "c",
  onChange,
}) {
  const active = ORIGINS[value];
  const pivotSize = size * 0.34;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        cursor: "pointer",
      }}
    >
      {/* object bounds */}
      <div
        style={{
          position: "absolute",
          inset: 2,
          borderRadius: 3,
          border: "1px solid #cbd5e1", // slate-300
          background: "linear-gradient(#ffffff, #f8fafc)",
        }}
      />

      {/* center guides */}
      <div
        style={{
          position: "absolute",
          inset: "50% 4px auto 4px",
          height: 1,
          background: "#e2e8f0", // slate-200
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "4px auto 4px 50%",
          width: 1,
          background: "#e2e8f0",
        }}
      />

      {/* click zones */}
      {Object.entries(ORIGINS).map(([id, o]) => (
        <div
          key={id}
          onClick={() =>
            onChange?.({ originX: o.x, originY: o.y, id })
          }
          style={{
            position: "absolute",
            left: o.left,
            top: o.top,
            width: size * 0.45,
            height: size * 0.45,
            transform: "translate(-50%,-50%)",
          }}
        />
      ))}

      {/* pivot */}
      {value === "c" ? (
        /* center pivot */
        <div
          style={{
            position: "absolute",
            left: active.left,
            top: active.top,
            width: pivotSize,
            height: pivotSize,
            borderRadius: "50%",
            background: "#ffffff",
            border: "2px solid #3b82f6", // blue-500
            boxShadow: `
              0 1px 2px rgba(0,0,0,0.15),
              0 0 0 3px rgba(59,130,246,0.15)
            `,
            transform: "translate(-50%,-50%)",
            transition: "all 140ms ease",
          }}
        />
      ) : (
        /* corner pivot */
        <div
          style={{
            position: "absolute",
            left: active.left,
            top: active.top,
            width: pivotSize,
            height: pivotSize,
            borderRadius: "50%",
            background: "#3b82f6",
            boxShadow: `
              0 2px 4px rgba(0,0,0,0.2),
              0 0 0 3px rgba(59,130,246,0.25)
            `,
            transform: "translate(-50%,-50%)",
            transition: "all 140ms ease",
          }}
        />
      )}
    </div>
  );
}
