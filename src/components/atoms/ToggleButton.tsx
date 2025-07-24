import clsx from "clsx";

export const ToggleButton = ({ on, onClick }) => {
    return <>
        <div className={'flex inline-flex mt-1'}>
            <div
              className={clsx('px-4 py-1 rounded-l-full text-white', on ? 'bg-teal-600' : 'bg-yellow-400')}
              onClick={onClick}
            ><i className="fa-solid fa-list"></i></div>

            <div
              className={clsx('px-4 py-1 rounded-r-full text-white', !on ? 'bg-teal-600' : 'bg-yellow-400')}
              onClick={onClick}
            ><i className="fa-solid fa-border-all"></i></div>
        </div>
    </>
}