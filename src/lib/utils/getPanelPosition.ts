export function getPanelPosition(toolbarPosition, rect, panelSize) {
    const gap = 18; // space between toolbar and panel

    switch (toolbarPosition) {
      case "left":
        return { top: rect.top - 10, left: rect.right + gap };
      case "right":
        return { top: rect.top, left: rect.left - panelSize.width - gap };
      case "top":
        return { top: rect.bottom + gap, left: rect.left };
      case "bottom":
        return { top: rect.top - panelSize.height - gap, left: rect.left };
      default:
        return { top: rect.top, left: rect.right + gap };
    }
}