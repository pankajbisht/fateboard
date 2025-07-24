import {Container} from "./Container.tsx";

export const Header = () => {
    return <div className={'flex flex-row justify-center p-4 bg-teal-500'}>
        <Container>
            <div className="flex flex-row justify-between items-center">
                <div className="flex flex-col">
                    <h1 className="text-3xl text-blue-900">My Music</h1>
                    <h2 className="text-sm text-blue-900">Dil se suno</h2>
                </div>
                <div>
                    Sujal
                </div>
            </div>
        </Container>
    </div>
}