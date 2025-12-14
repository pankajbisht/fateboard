const ToolbarButton = ({ title, icon, onClick }) => (
  <button
    title={title}
    onClick={onClick}
    className="border rounded p-1 w-8 h-8 flex items-center justify-center hover:bg-gray-200 transition"
  >
    <i className={`fa-solid fa-${icon}`}></i>
  </button>
);
