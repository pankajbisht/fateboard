import { Header } from "../organisms/Header.tsx";
import { Footer } from "../organisms/Footer.tsx";

export const GalleryTemplate = ({ children }) => {
    return <>
        <Header />
        <div className="my-4">
            { children }
        </div>
        <Footer />
    </>
}