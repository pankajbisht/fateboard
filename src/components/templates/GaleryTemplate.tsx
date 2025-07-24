import { Header } from "../organisms/Header.tsx";
import { Footer } from "../organisms/Footer.tsx";

export const GaleryTemplate = ({ children }) => {
    return <>
        <Header />
        <div>
            { children }
        </div>
        <Footer />
    </>
}