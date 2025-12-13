import { useStore } from "@store";
import { ToggleGroup } from "../molecules/ToggleGroup.tsx";
import LabeledInput from "../atoms/LabeledInput.tsx";
import OriginSelector from "../molecules/OriginSelector.tsx";
import { useState } from "react";
import Brand from "../atoms/Brand.tsx";
import FlipIcon from "../../assets/icons/flip.tsx";
import { Tooltip } from "../molecules/Tooltip.tsx";

const round = (val) => Math.round(val);



/**
 * SingleToggleButton
 * @param {string} keyOn - key for active state
 * @param {string} keyOff - key for inactive state
 * @param {string} iconOn - icon class for active
 * @param {string} iconOff - icon class for inactive
 * @param {string} tooltipOn - tooltip when active
 * @param {string} tooltipOff - tooltip when inactive
 * @param {boolean} initial - optional initial state
 * @param {function} onChange - callback({ action, value })
 */

 /**
  * SingleToggleButton
  * Supports both JSX icons (SVG/React) and Font Awesome class strings
  */
 export function SingleToggleButton({
   action,
   toggleType = "switch",
   iconOn,
   iconOff,
   tooltipOn = "",
   tooltipOff = "",
   initial = false,
   size = 26,
   onChange,
 }) {
   const [active, setActive] = useState(initial);

   const handleClick = () => {
     let next = active;
     if (toggleType === "switch") next = !active;
     if (toggleType === "exclusive") next = true;

     setActive(next);
     onChange?.({ action, value: next });
   };

   const renderIcon = (icon) => {
     if (typeof icon === "string") {
       // Font Awesome class string
       return <i className={icon} style={{ fontSize: size * 0.55 }} />;
     }
     // JSX / React component (SVG)
     return icon;
   };

   return (
       <Tooltip content={active ? tooltipOn : tooltipOff} position="bottom">
     <button
       onClick={handleClick}
       style={{
         width: size,
         height: size,
         borderRadius: 6,
         background: active
           ? "linear-gradient(#3b82f6, #2563eb)"
           : "linear-gradient(#ffffff, #f1f5f9)",
         border: "1px solid #cbd5e1",
         boxShadow: active
           ? "0 2px 4px rgba(37,99,235,0.4)"
           : "0 1px 2px rgba(0,0,0,0.12)",
         display: "flex",
         alignItems: "center",
         justifyContent: "center",
         cursor: "pointer",
         transition: "all 140ms ease",
         color: active ? "#fff" : "#334155",
       }}
     >
       <div
         style={{
           width: size * 0.6,
           height: size * 0.6,
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
         }}
       >
         {renderIcon(active ? iconOn : iconOff)}
       </div>
     </button>
       </Tooltip>
   );
 }






/**
 * ToolToggle
 * @param {Array} options - array of { key, icon, tooltip, toggleType }
 * toggleType: "exclusive" | "switch"
 */
export default function ToolToggle({ options = [], size = 26, onChange }) {
  const [activeKeys, setActiveKeys] = useState(() => {
    // For exclusive: store only one
    // For switch: store boolean states
    const initial = {};
    options.forEach((opt) => {
      initial[opt.key] = opt.toggleType === "exclusive" ? false : false;
    });
    return initial;
  });

  const handleClick = (option) => {
    const { key, toggleType } = option;

    let updated = { ...activeKeys };

    if (toggleType === "exclusive") {
      // Only this one is true, others false
      Object.keys(updated).forEach((k) => {
        updated[k] = k === key;
      });
    } else {
      // Toggle type switch: flip true/false
      updated[key] = !updated[key];
    }

    setActiveKeys(updated);
    onChange?.(updated);
  };

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((option) => {
        const isActive = activeKeys[option.key];

        return (
          <button
            key={option.key}
            title={option.tooltip}
            onClick={() => handleClick(option)}
            style={{
              width: size,
              height: size,
              borderRadius: 6,
              background: isActive
                ? "linear-gradient(#3b82f6, #2563eb)" // active
                : "linear-gradient(#ffffff, #f1f5f9)", // inactive
              border: "1px solid #cbd5e1",
              boxShadow: isActive
                ? "0 2px 4px rgba(37,99,235,0.4)"
                : "0 1px 2px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 140ms ease",
            }}
          >
            <i
              className={option.icon}
              style={{
                fontSize: size * 0.55,
                color: isActive ? "#fff" : "#334155",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}




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



const TransformInput = ({ label, value, disabled, onChange }) => {
  const handleChange = (e) => {
    const raw = e; // e.target.value

    // Ensure empty input doesn't force NaN
    if (raw === "") {
      onChange(0);
      return;
    }

    let num = parseInt(raw, 10);
    if (isNaN(num)) num = 0;

    onChange(num);
  };

  const onKeyDownHandler = (e) => {
    if (e.key === "." || e.key === "e") e.preventDefault();
  };

  return (
    <LabeledInput
      label={label}
      value={value ?? 0}
      onChange={handleChange}
      disabled={disabled}
      onKeyDown={onKeyDownHandler}
    />
  );
};

const ToolbarButton = ({ title, icon, onClick }) => (
  <button
    title={title}
    onClick={onClick}
    className="border rounded p-1 w-8 h-8 flex items-center justify-center hover:bg-gray-200 transition"
  >
    <i className={`fa-solid fa-${icon}`}></i>
  </button>
);

/* ------------------------
   Config Arrays
------------------------ */
const transformFields = [
  { key: "x", label: "X" },
  { key: "y", label: "Y" },
  { key: "width", label: "W" },
  { key: "height", label: "H" },
  { key: "rotation", label: "R" },
];

const flipButtons = [
  { title: "Flip X", icon: "arrows-left-right", key: "flipX" },
  { title: "Flip Y", icon: "arrows-up-down", key: "flipY" },
];

const layerButtons = [
  { title: "Group", icon: "object-group", key: "group" },
  { title: "Ungroup", icon: "object-ungroup", key: "ungroup" },
  { divider: true },
  { title: "Lock", icon: "lock", key: "lock" },
  { title: "Unlock", icon: "unlock", key: "unlock" },
  { divider: true },
  { title: "Send to Back", icon: "arrow-down", key: "sendtoback" },
  { title: "Bring to Front", icon: "arrow-up", key: "bringtofront" },
  { divider: true },
  { title: "Delete", icon: "trash", key: "delete" },
];

const alignButtons = [
  // Horizontal alignment
  { title: "Align Left", icon: "align-left", key: "align-left" },
  {
    title: "Align Center (Horizontally)",
    icon: "align-center",
    key: "align-hcenter",
  },
  { title: "Align Right", icon: "align-right", key: "align-right" },

  // Vertical alignment
  { title: "Align Top", icon: "align-up", key: "align-top" },
  {
    title: "Align Middle (Vertically)",
    icon: "align-middle",
    key: "align-vcenter",
  },
  { title: "Align Bottom", icon: "align-down", key: "align-bottom" },

  // Distribute horizontally / vertically
  {
    title: "Distribute Horizontally",
    icon: "grip-lines-horizontal",
    key: "distribute-h",
  },
  {
    title: "Distribute Vertically",
    icon: "grip-lines-vertical",
    key: "distribute-v",
  },
];

/* ------------------------
   Main Header
------------------------ */
export const ShapeToolsHeader = () => {
  const transform = useStore((s) => s.transform);
  const setTransform = useStore((s) => s.setTransform);
  const groupLayers = useStore((s) => s.groupLayers);
  const ungroupSelected = useStore((s) => s.ungroupSelected);
  const bringForward = useStore((s) => s.bringForward);
  const sendBackward = useStore((s) => s.sendBackward);
  const toggleActiveObjectLock = useStore((s) => s.toggleActiveObjectLock);
  const alignObjects = useStore((s) => s.alignObjects);
  const hasSelection = useStore((s) => s.hasSelection);
  const removeLayer = useStore((s) => s.removeLayer);
  const canvas = useStore(s => s.canvas)

  const [origin, setOrigin] = useState({
    id: "c",
    originX: "center",
    originY: "center",
  });

  const [snap, setSnap] = useState(false);


  const handleButton = (key, value) => {
    if (key === "group") {
      groupLayers();
    } else if (key === "ungroup") {
      ungroupSelected();
    } else if (key === "sendtoback") {
      bringForward();
    } else if (key === "bringtofront") {
      sendBackward();
    } else if (key === "lock") {
      toggleActiveObjectLock();
    } else if (key === "unlock") {
      toggleActiveObjectLock();
    } else if (key === "delete") {
      removeLayer();
    }
  };

  const handleAlginmentAndDistributeButton = (key, value) => {
    alignObjects(key);
  };

  return (
    <div className="px-5 py-2 overflow-x-auto shadow-sm bg-white">

      <div className="flex items-center justify-between whitespace-nowrap text-sm">
        <div className="flex items-center gap-4">

            {/*<OriginSelector
              size={24}
              value={origin.id}
              onChange={setOrigin}
            />
*/}

            <OriginSelector
              size={24}
              value={origin.id}
              onChange={(o) => {
                setOrigin(o);
                // applyOrigin(canvas, o.originX, o.originY);
              }}
            />


          <div className="flex items-center gap-2">
            {transformFields.map((field) => (
              <TransformInput
                key={field.key}
                label={field.label}
                value={transform[field.key]}
                disabled={!hasSelection}
                onChange={(val) => setTransform(field.key, val)}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="border-l h-6 border-gray-300" />

          {/* Flip */}
          {/*<div className="flex items-center gap-1">*/}
          {/*  {flipButtons.map((btn, i) => (*/}
          {/*    <ToolbarButton*/}
          {/*      key={i}*/}
          {/*      title={btn.title}*/}
          {/*      icon={btn.icon}*/}
          {/*      onClick={() => setTransform(btn.key, !transform[btn.key])}*/}
          {/*    />*/}
          {/*  ))}*/}
          {/*</div>*/}

          {/*  const flipButtons = [*/}
          {/*  { title: "Flip X", icon: "arrows-left-right", key: "flipX" },*/}
          {/*  { title: "Flip Y", icon: "arrows-up-down", key: "flipY" },*/}
          {/*];*/}

          {/*<ToggleGroup
            options={[
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
            ]}
            onChange={(formats) => {
                console.log(formats);
              const { flipX, flipY } = formats;

              for (const [key, value] of Object.entries(formats)) {
                setTransform(key, value);
              }
            }}
          />*/}

          {/*<ToolToggle
            options={[
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
            ]}
            value="flipX" // optional: set initial selection
            onChange={(formats) => {
                console.log(formats)
                const { key, value } = formats;
              console.log("Active:", key);
              setTransform(key, value); // apply your flip logic here
            }}
          />*/}

          <SingleToggleButton
            action="flipX"
            toggleType="switch"
            iconOn={<FlipIcon className="cursor-pointer hidden md:block"/>}
            iconOff={<FlipIcon className="cursor-pointer hidden md:block"/>}
            tooltipOn="Flipped horizontally"
            tooltipOff="Flip horizontally"
            initial={false}
            onChange={(formats) => {
              const { action, value } = formats;
              console.log(action, value);
              setTransform(action, value);
            }}
          />


          <SingleToggleButton
            action="flipY"
            toggleType="switch"
            iconOn={<FlipIcon className="rotate-90 cursor-pointer hidden md:block"/>}
            iconOff={<FlipIcon className="rotate-90 cursor-pointer hidden md:block"/>}
            tooltipOn="Flipped vertically"
            tooltipOff="Flip vertically"
            initial={false}
            onChange={(formats) => {
                console.log(formats);
                  const { action, value } = formats;
                setTransform(action, value);
            }}
          />

        </div>

        {/* --- Right: Layer & Align --- */}
        <div className="flex items-center gap-4">
          {/*<div className="flex items-center gap-1">*/}
          {/*  {layerButtons.map((btn, i) =>*/}
          {/*    btn.divider ? (*/}
          {/*      <div key={i} className="border-l h-6 border-gray-300" />*/}
          {/*    ) : (*/}
          {/*      <ToolbarButton*/}
          {/*        key={i}*/}
          {/*        title={btn.title}*/}
          {/*        icon={btn.icon}*/}
          {/*        onClick={() => handleButton(btn.key, btn)} />*/}
          {/*    )*/}
          {/*  )}*/}
          {/*</div>*/}

          {/*  const layerButtons = [*/}
          {/*  { title: "Group", icon: "object-group", key: "group" },*/}
          {/*  { title: "Ungroup", icon: "object-ungroup", key: "ungroup" },*/}
          {/*  { divider: true },*/}
          {/*  { title: "Lock", icon: "lock", key: "lock" },*/}
          {/*  { title: "Unlock", icon: "unlock", key: "unlock" },*/}
          {/*  { divider: true },*/}
          {/*  { title: "Send to Back", icon: "arrow-down", key: "sendtoback" },*/}
          {/*  { title: "Bring to Front", icon: "arrow-up", key: "bringtofront" },*/}
          {/*  { divider: true },*/}
          {/*  { title: "Delete", icon: "trash", key: "delete" },*/}
          {/*];*/}

          <ToggleGroup
            single={true}
            options={[
              {
                key: "group",
                icon: "fa-solid fa-object-group",
                tooltip: "Group",
              },
              {
                key: "ungroup",
                icon: "fa-solid fa-object-ungroup",
                tooltip: "Ungroup",
              },
            ]}
            onChange={(formats) => {
              const { group, ungroup } = formats;

              const active = Object.entries(formats).find(
                ([_, value]) => value
              );
              console.log("Group:", active);

              if (active) {
                const [key, value] = active;
                handleButton(key, value);
              }
            }}
          />

          <div className="border-l h-6 border-gray-300" />

          {/*<ToggleGroup
            single
            options={[
              { key: "lock", icon: "fa-solid fa-lock", tooltip: "Lock" },
              { key: "unlock", icon: "fa-solid fa-unlock", tooltip: "UnLock" },
            ]}
            onChange={(formats) => {
              const { lock, unlock } = formats;

              const active = Object.entries(formats).find(
                ([_, value]) => value
              );
              console.log("Lock:", active);

              if (active) {
                const [key, value] = active;
                handleButton(key, value);
              }
            }}
          />*/}

          {/*<ToolToggle
            options={[
                { key: "lock", icon: "fa-solid fa-lock", tooltip: "Lock" },
                { key: "unlock", icon: "fa-solid fa-unlock", tooltip: "UnLock" },
            ]}
            onChange={(formats) => {

              const { staet } = formats;

              const active = Object.entries(formats).find(
                ([_, value]) => value
              );
              console.log("Lock:", active);

              if (active) {
                const [key, value] = active;
                handleButton(key, value);
              }
            }}
          />*/}

          {/*<ToolToggle
            options={[
              { key: "lock", icon: "fa-solid fa-lock", tooltip: "Lock" },
              { key: "unlock", icon: "fa-solid fa-unlock", tooltip: "UnLock" },
            ]}
            onChange={(key) => {
              console.log("Active:", key); // key = "lock" or "unlock"
              handleButton(key);           // directly pass it
            }}
          />*/}

          {/*<SingleToggleButton
            action="lock"
            keyOff="unlock"
            iconOn="fa-solid fa-lock"
            iconOff="fa-solid fa-unlock"
            tooltipOn="Locked"
            tooltipOff="Unlocked"
            initial={false} // start unlocked
            onChange={(formats) => {
                const { key, value } = formats;

                handleButton(key, value);
            }}
          />

          */}

          {/*<SingleToggleButton
            action="lock"
            toggleType="switch"
            iconOn="fa-solid fa-lock"
            iconOff="fa-solid fa-unlock"
            tooltipOn="Locked"
            tooltipOff="Unlocked"
            onChange={({ action, value }) => {
              console.log(action, value); // lock true/false
              handleButton(action, value);
            }}
          />*/}

          <SingleToggleButton
            action="lock"
            toggleType="switch"
            iconOn="fa-solid fa-lock"
            iconOff="fa-solid fa-unlock"
            tooltipOn="Locked"
            tooltipOff="Unlocked"
            initial={false}
            onChange={(formats) => {
              const { action, value } = formats;
              console.log(action, value);
              handleButton(action, value);
            }}
          />

          <ToggleGroup
            single
            options={[
              {
                key: "sendtoback",
                icon: "fa-solid fa-arrow-down",
                tooltip: "Send to back",
              },
              {
                key: "bringtofront",
                icon: "fa-solid fa-arrow-up",
                tooltip: "Bring to bfront",
              },
            ]}
            onChange={(formats) => {
              const { sendtoback, bringtofront } = formats;

              const active = Object.entries(formats).find(
                ([_, value]) => value
              );
              console.log("Back:", active);

              if (active) {
                const [key, value] = active;
                handleButton(key, value);
              }
            }}
          />

          {/*<div className="flex items-center gap-1">*/}
          {/*  {alignButtons.map((btn, i) => (*/}
          {/*    <ToolbarButton*/}
          {/*      key={i}*/}
          {/*      title={btn.title}*/}
          {/*      icon={btn.icon}*/}
          {/*      onClick={() => handleAlginmentAndDistributeButton(btn.key, btn)}*/}
          {/*     />*/}
          {/*  ))}*/}
          {/*</div>*/}

          <ToggleGroup
            single
            options={[
              {
                key: "left",
                icon: "fa-solid fa-align-left",
                tooltip: "Align Left",
              },
              {
                key: "center",
                icon: "fa-solid fa-align-center",
                tooltip: "Align Center",
              },
              {
                key: "right",
                icon: "fa-solid fa-align-right",
                tooltip: "Align Right",
              }
            ]}
            onChange={(formats) => {
              console.log("align:", formats);
              const { left, center, right, justify } = formats;
              let textAlign = "align-left"; // default fallback

              if (center) textAlign = "align-hcenter";
              else if (right) textAlign = "align-right";

              handleAlginmentAndDistributeButton(textAlign, formats);
            }}
          />

          <div className="border-l h-6 border-gray-300" />

          {/*{ title: "Align Top", icon: "align-up", key: "align-top" },*/}
          {/*{ title: "Align Middle (Vertically)", icon: "align-middle", key: "align-vcenter" },*/}
          {/*{ title: "Align Bottom", icon: "align-down", key: "align-bottom" },*/}

          {/*// Distribute horizontally / vertically*/}
          {/*{ title: "Distribute Horizontally", icon: "grip-lines-horizontal", key: "distribute-h" },*/}
          {/*{ title: "Distribute Vertically", icon: "grip-lines-vertical", key: "distribute-v" },*/}

          <ToggleGroup
            single
            options={[
              {
                key: "top",
                icon: "fa-solid fa-align-left rotate-90",
                tooltip: "Align Top",
              },
              {
                key: "middle",
                icon: "fa-solid fa-align-center -rotate-90",
                tooltip: "Align Middle",
              },
              {
                key: "bottom",
                icon: "fa-solid fa-align-right rotate-90",
                tooltip: "Align Bottom",
              },
            ]}
            onChange={(formats) => {
              console.log("align:", formats);
              const { top, middle, bottom } = formats;
              let textAlign = "align-left"; // default fallback

              if (top) textAlign = "align-top";
              else if (middle) textAlign = "align-vcenter";
              else if (bottom) textAlign = "align-bottom";

              handleAlginmentAndDistributeButton(textAlign, formats);
            }}
          />

          {/*// Distribute horizontally / vertically*/}
          {/*{ title: "Distribute Horizontally", icon: "grip-lines-horizontal", key: "distribute-h" },*/}
          {/*{ title: "Distribute Vertically", icon: "grip-lines-vertical", key: "distribute-v" },*/}

          <ToggleGroup
            single
            options={[
              {
                key: "distribute-h",
                icon: "fa-solid fa-align-left rotate-90",
                tooltip: "Distribute horizontally",
              },
              {
                key: "distribute-v",
                icon: "fa-solid fa-align-center -rotate-90",
                tooltip: "Distribute vertically",
              },
            ]}
            onChange={(formats) => {
              console.log("align:", formats);
              const {
                "distribute-v": distributeV,
                "distribute-h": distributeH,
              } = formats;
              let textAlign = "align-left"; // default fallback

              if (distributeH) textAlign = "distribute-h";
              else if (distributeV) textAlign = "distribute-v";

              handleAlginmentAndDistributeButton(textAlign, formats);
            }}
          />
        </div>
      </div>
    </div>
  );
};
