import { ListItem } from '../atoms/ListItem.tsx';

export const SongListDisplay = ({ songs }) => {
    console.log(songs);
    return <ul className="flex flex-col gap-2 px-4">
        {songs.map((song, idx) => (
            <ListItem key={idx} el={song.text} icon={song.src} />
        ))}
    </ul>
};
