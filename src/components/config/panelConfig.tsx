import { DrawPanel } from "../organisms/DrawPanel.tsx";
import { ShapePanel } from "../organisms/ShapePanel.tsx";
import { TransformPanel } from "../organisms/TransformPanel.tsx";

export const leftPanelConfig = [
    {
        id: "layout",
        icon: "fa-solid fa-location-arrow rotate-280",
        position: "left",
        component: null
    },
    {
        id: "draw",
        icon: "fa-solid fa-pencil",
        position: "left",
        component: (props) => <DrawPanel {...props} panelId="draw" />,
    },
    {
      id: "shapes",
      icon: "fa-solid fa-shapes",
      position: "left",
      component: (props) => <ShapePanel {...props} panelId="shapes" />,
    },
    {
      id: "text",
      icon: "fa-solid fa-font",
      position: "left",
      component: null
//      component: (props) => {
//        const addText = useStore((state) => state.addText);
//        return <TextPanel {...props} panelId="text" onAddText={addText} />;
//      },
    },
//    { id: "undo", icon: "fa-solid fa-rotate-right", position: "left", component: null },
//    { id: "redo", icon: "fa-solid fa-rotate-left", position: "left", component: null },
];

export const rightPanelConfig = [
    {
        id: "transform",
        icon: "fa fa-vector-square",
        position: "right",
        component: (props) => <TransformPanel {...props} />
    },
    {
        id: "group",
        icon: "fa-solid fa-solid fa-object-group",
        position: "right",
        component: null
    },
    {
        id: "ungroup",
        icon: "fa-solid fa-solid fa-object-ungroup",
        position: "right",
        component: null
    },
    {
        id: "delete",
        icon: "fa-solid fa-trash",
        position: "right",
        component: null
    },
    {
        id: "lock",
        icon: "fa-solid fa-lock",
        position: "right",
        component: null
    },
    {
        id: "forward",
        icon: "fa-solid fa-angle-up",
        position: "right",
        component: null
    },
//    {
//        id: "forwards",
//        icon: "fa-solid fa-angles-up",
//        position: "right",
//        component: null
//    },
    {
        id: "backward",
        icon: "fa-solid fa-angle-down",
        position: "right",
        component: null
    },
//    {
//        id: "backwards",
//        icon: "fa-solid fa-angles-down",
//        position: "right",
//        component: null
//    },


//    {
//        id: "layers",
//        icon: "fa-solid fa-layer-group",
//        position: "right",
//        component: (props) => <LayerPanel {...props} />
//    },

];