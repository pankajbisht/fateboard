import { Card } from '../molecules/Card.tsx'
import { Container } from "./Container.tsx";


export const SongInCardList = ({ data, on, onClick }) => {
    return <>
        <div className="flex">
            <Container>
                <div className="flex justify-around flex-wrap gap-4">
                {
                      data.map((card) => <Card src={card.src} text={card.text} />)
                }
                </div>
            </Container>
        </div>
    </>
}