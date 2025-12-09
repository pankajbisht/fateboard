import { useStore } from "@store";
import { ToggleGroup } from "../molecules/ToggleGroup.tsx";
import LabeledInput from "../atoms/LabeledInput.tsx";

const round = (val) => Math.round(val);

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

          <ToggleGroup
            single={false}
            options={[
              { key: "flipX", icon: "fa-solid fa-arrows-left-right" },
              { key: "flipY", icon: "fa-solid fa-arrows-up-down" },
            ]}
            onChange={(formats) => {
              const { flipX, flipY } = formats;

              for (const [key, value] of Object.entries(formats)) {
                setTransform(key, value);
              }
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
              { key: "group", icon: "fa-solid fa-object-group" },
              { key: "ungroup", icon: "fa-solid fa-object-ungroup" },
            ]}
            onChange={(formats) => {
              const { group, ungroup } = formats;

              const active = Object.entries(formats).find(
                ([_, value]) => value
              );
              console.log("align:", active);

              if (active) {
                const [key, value] = active;
                handleButton(key, value);
              }
            }}
          />

          <div className="border-l h-6 border-gray-300" />

          <ToggleGroup
            single
            options={[
              { key: "lock", icon: "fa-solid fa-lock" },
              { key: "flipY", icon: "fa-solid fa-unlock" },
            ]}
            onChange={(formats) => {
              console.log("align:", formats);
              const { left, center, right, justify } = formats;
              let textAlign = "align-left"; // default fallback

              if (center) textAlign = "align-hcenter";
              else if (right) textAlign = "align-right";
              else if (justify) textAlign = "align-justify";

              handleAlginmentAndDistributeButton(textAlign, formats);
            }}
          />

          <ToggleGroup
            single
            options={[
              { key: "sendtoback", icon: "fa-solid fa-arrow-down" },
              { key: "bringtofront", icon: "fa-solid fa-arrow-up" },
            ]}
            onChange={(formats) => {
              console.log("align:", formats);
              const { left, center, right, justify } = formats;
              let textAlign = "align-left"; // default fallback

              if (center) textAlign = "align-hcenter";
              else if (right) textAlign = "align-right";
              else if (justify) textAlign = "align-justify";

              handleAlginmentAndDistributeButton(textAlign, formats);
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
              { key: "left", icon: "fa-solid fa-align-left" },
              { key: "center", icon: "fa-solid fa-align-center" },
              { key: "right", icon: "fa-solid fa-align-right" },
              { key: "justify", icon: "fa-solid fa-align-justify" },
            ]}
            onChange={(formats) => {
              console.log("align:", formats);
              const { left, center, right, justify } = formats;
              let textAlign = "align-left"; // default fallback

              if (center) textAlign = "align-hcenter";
              else if (right) textAlign = "align-right";
              else if (justify) textAlign = "align-justify";

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
            options={[
              { key: "top", icon: "fa-solid fa-align-left rotate-90" },
              { key: "middle", icon: "fa-solid fa-align-center -rotate-90" },
              { key: "bottom", icon: "fa-solid fa-align-right rotate-90" },
            ]}
            onChange={(formats) => {
              console.log("align:", formats);
              const { left, center, right, justify } = formats;
              let textAlign = "align-left"; // default fallback

              if (center) textAlign = "align-hcenter";
              else if (right) textAlign = "align-right";
              else if (justify) textAlign = "align-justify";

              handleAlginmentAndDistributeButton(textAlign, formats);
            }}
          />

          {/*// Distribute horizontally / vertically*/}
          {/*{ title: "Distribute Horizontally", icon: "grip-lines-horizontal", key: "distribute-h" },*/}
          {/*{ title: "Distribute Vertically", icon: "grip-lines-vertical", key: "distribute-v" },*/}

          <ToggleGroup
            options={[
              { key: "distribute-h", icon: "fa-solid fa-align-left rotate-90" },
              {
                key: "distribute-v",
                icon: "fa-solid fa-align-center -rotate-90",
              },
            ]}
            onChange={(formats) => {
              console.log("align:", formats);
              const { left, center, right, justify } = formats;
              let textAlign = "align-left"; // default fallback

              if (center) textAlign = "align-hcenter";
              else if (right) textAlign = "align-right";
              else if (justify) textAlign = "align-justify";

              handleAlginmentAndDistributeButton(textAlign, formats);
            }}
          />
        </div>
      </div>
    </div>
  );
};
