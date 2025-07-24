import { GaleryTemplate } from "../templates/GaleryTemplate.tsx";
import { SongInCardList } from "../organisms/SongInCardList.tsx";
import { useState } from "react";
import { ToggleButton } from "../atoms/ToggleButton.tsx";
import { Container } from "../organisms/Container.tsx";
import {SongInList} from "../organisms/SongInList.tsx";

export const SongGallery = () => {
    const [isOn, setIsOn] = useState(false);

    const [cards, setCards] = useState([
        { id: 1, src: 'https://picsum.photos/id/1011/400/300', text: 'Explore the beauty of nature and mountains.' },
        { id: 2, src: 'https://picsum.photos/id/1012/400/300', text: 'Feel the calmness of the deep forest.' },
        { id: 3, src: 'https://picsum.photos/id/1015/400/300', text: 'Adventure awaits in every direction you choose.' },
        { id: 4, src: 'https://picsum.photos/id/1016/400/300', text: 'Experience peace along the shoreline sunsets.' },
        { id: 5, src: 'https://picsum.photos/id/1018/400/300', text: 'Discover the beauty of ancient architecture.' },
        { id: 6, src: 'https://picsum.photos/id/1020/400/300', text: 'Capture the golden hues of autumn.' },
        { id: 7, src: 'https://picsum.photos/id/1024/400/300', text: 'Get close to the wild side with nature’s beasts.' },
        { id: 8, src: 'https://picsum.photos/id/1027/400/300', text: 'Serenity and peace lie within the hills.' },
        { id: 9, src: 'https://picsum.photos/id/1035/400/300', text: 'Discover hidden gems in faraway cities.' },
        { id: 10, src: 'https://picsum.photos/id/1039/400/300', text: 'Chase the sunrise and embrace new beginnings.' },
    ]);

    return <>
        <GaleryTemplate>
            <Container>
                <div className="flex justify-end py-4 px-2">
                    <ToggleButton on={isOn} onClick={() => setIsOn(!isOn)} />
                </div>

                {   isOn ?
                    <SongInCardList data={cards}/> :
                    <SongInList data={cards}/>
                }
            </Container>
        </GaleryTemplate>
    </>
}