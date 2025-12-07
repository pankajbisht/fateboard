import { createPortal } from "react-dom";

const Portal = ({ children }) => {
  const portalRoot = document.getElementById("fateboard-portal");
  return createPortal(children, portalRoot);
};

export default Portal;
