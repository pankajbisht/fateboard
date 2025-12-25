import { DrawPanel } from '../organisms/DrawPanel.tsx';
import { ShapePanel } from '../organisms/ShapePanel.tsx';
import { TransformPanel } from '../organisms/TransformPanel.tsx';

export const leftPanelConfig = [
    {
        id: 'select',
        type: 'exclusive',
        icon: 'fa-solid fa-location-arrow rotate-280',
        position: 'left',
        component: null,
        tooltip: 'Selector Tool',
    },
    {
        id: 'pan',
        type: 'exclusive',
        icon: 'fa-solid fa-hand',
        position: 'left',
        component: null,
        tooltip: 'Hand Tool',
    },
    {
        id: 'draw',
        type: 'panel',
        icon: 'fa-solid fa-pencil',
        position: 'left',
        component: DrawPanel,
        panelSize: { width: 300, height: 250 },
        tooltip: 'Pencil Tool',
    },
    {
        id: 'shapes',
        type: 'panel',
        icon: 'fa-solid fa-shapes',
        position: 'left',
        component: (props) => <ShapePanel {...props} panelId="shapes" />,
        tooltip: 'Shape Builder Tool',
    },
    {
        id: 'text',
        type: 'momentary', // adds text immediately, no panel
        icon: 'fa-solid fa-font',
        position: 'left',
        component: null,
        tooltip: 'Text Tool',
    },
    // {
    //   id: "undo",
    //   type: "momentary", // adds text immediately, no panel
    //   icon: "fa-solid fa-undo",
    //   position: "left",
    //   component: null,
    // },
    // {
    //   id: "redo",
    //   type: "momentary", // adds text immediately, no panel
    //   icon: "fa-solid fa-redo",
    //   position: "left",
    //   component: null,
    // },
];

export const rightPanelConfig = [
    // {
    //   id: "transform",
    //   type: "panel",
    //   icon: "fa fa-vector-square",
    //   position: "right",
    //   component: (props) => <TransformPanel {...props} />,
    //   tooltip: "Transformation Tool"
    // },
    // {
    //   id: "group",
    //   type: "momentary",
    //   icon: "fa-solid fa-object-group",
    //   position: "right",
    //   component: null,
    //   tooltip: "Group"
    // },
    // {
    //   id: "ungroup",
    //   type: "momentary",
    //   icon: "fa-solid fa-object-ungroup",
    //   position: "right",
    //   component: null,
    //   tooltip: "Ungroup"
    // },
    // {
    //   id: "delete",
    //   type: "momentary",
    //   icon: "fa-solid fa-trash",
    //   position: "right",
    //   component: null,
    //   tooltip: "Delete"
    // },
    //  {
    //    id: "lock",
    //    type: "momentary",
    //    icon: "fa-solid fa-lock",
    //    position: "right",
    //    component: null,
    //  },
    //  {
    //    id: "forward",
    //    type: "momentary",
    //    icon: "fa-solid fa-angle-up",
    //    position: "right",
    //    component: null,
    //  },
    //  {
    //    id: "backward",
    //    type: "momentary",
    //    icon: "fa-solid fa-angle-down",
    //    position: "right",
    //    component: null,
    //  },
    //  {
    //    id: "fullscreen",
    //    type: "momentary",
    //    icon: "fa-solid fa-up-right-and-down-left-from-center",
    //    position: "right",
    //    component: null,
    //  },
    //  { id: "zoomIn", type: "momentary", icon: "fa-solid fa-magnifying-glass-plus", position: "right" },
    //  { id: "zoomOut", type: "momentary", icon: "fa-solid fa-magnifying-glass-minus", position: "right" },
    //  { id: "zoomFit", type: "momentary", icon: "fa-solid fa-expand", position: "right" },
    //  { id: "copy", type: "momentary", icon: "fa-solid fa-copy", position: "right" },
    //  { id: "paste", type: "momentary", icon: "fa-solid fa-paste", position: "right" },
    // { id: "duplicate", type: "momentary", icon: "fa-solid fa-clone", position: "right", tooltip: "Duplicate" },
];
