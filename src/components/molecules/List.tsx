import { ListItem } from '../atoms/ListItem.tsx';
import { Input } from '../atoms/Input.tsx'


export const List = ({ list, onClick }) => {

    return <>
        {/*<Input label="Search Song.." value={value} onChange={onChange} />*/}

        <ul>
            {
                list.map((el, i) => {
                    return <ListItem key={i} el={el} onClick={onClick} />
                })
            }
        </ul>
    </>
}