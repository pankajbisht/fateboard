import { useState } from 'react';
import { SongListDisplay } from '../molecules/SongListDisplay';
import {Container} from "./Container.tsx";

export const SongInList = ({ title, data, icon, theme }) => {
    const [songs, setSongs] = useState(data);
    const [newSong, setNewSong] = useState('');
    const [search, setSearch] = useState('');

    const addSong = () => {
        if (newSong.trim()) {
            setSongs([...songs, newSong.trim()]);
            setNewSong('');
        }
    };

    return (
        <div>
            <Container>
                <div className={`flex flex-col gap-4 rounded-xl`}>
                    <SongListDisplay songs={data} />
                </div>
            </Container>
        </div>
    );
};
