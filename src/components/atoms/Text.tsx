export const Text = ({ label, onChange }) => {
    return <>
        <input
            type="text" placeholder={label}
            className="mr-2 py-2 px-4 border-2 border-blue-200 bg-white rounded-full bg-white"
            onChange={onChange}
        />
    </>
}