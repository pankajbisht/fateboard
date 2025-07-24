import clsx from 'clsx';

export const Button = (props) => {
    const { size='md', variant='primary', onClick, children } = props;

    const sizes = {
        sm: "px-3 py-1 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-5 py-3 text-lg"
    };

    const variants = {
        primary: "bg-blue-500 hover:bg-blue-600",
        danger: "bg-rose-500 hover:bg-rose-600"
    };


    return <button className={clsx("text-white rounded-lg", sizes[size], variants[variant])} onClick={onClick}>
        { children }
    </button>
}
