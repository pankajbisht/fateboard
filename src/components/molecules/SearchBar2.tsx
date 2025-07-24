import { Button } from '../atoms/Button.tsx'
import { Text } from '../atoms/Text.tsx'
import { Label } from '../atoms/Label.tsx'

export const SearchBar = ({ label, value, onClick, onChange, isLabel, isInput }) => {

    return <>
        <div className="flex flex-col gap-4 jusftiy-arround bg-stone-200 p-4 rounded-xl w-90">
            { isLabel && <Label /> }
            { isInput && <Text label="Add New Song.." value={value} onChange={onChange} /> }
            <Button label={label} onClick={onClick}/>
        </div>
    </>
}