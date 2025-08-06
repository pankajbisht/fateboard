import clsx from 'clsx';

const EIconButton = ({ icon, onClick, isActive }) => (
  <i
    className={clsx(
      icon,
      'cursor-pointer p-2 rounded-sm',
      isActive
        ? 'bg-blue-500 text-white hover:bg-blue-600'
        : 'text-stone-900 hover:bg-stone-200'
    )}
    onClick={onClick}
  ></i>
);

export default EIconButton;
