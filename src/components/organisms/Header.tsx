import db from "opendb-store";
import ZoomDropdown from "../molecules/ZoomDropdown.tsx";
import { IconButton } from "../atoms/IconButton.tsx";
import { useStore } from "../../store/store.ts";
import DownloadMenu from "./DownloadMenu.tsx";
import {Fullscreen} from "./FullScreen.tsx";

export const Header = () => {
    const canvas = useStore((s) => s.canvas);

    const handleClick = () => {
        const savedState = canvas.toJSON();
        db.local.set('drawJson', savedState);
    }

    const clearClick = () => {
        db.local.clear();
        canvas.clear();
        canvas.backgroundColor = "#FFF";
        canvas.requestRenderAll();
      };


    return <header className="fixed top-0 left-0 right-0 bg-stone-100 flex flex-row justify-between items-center">
        <div className="flex items-center justify-between w-full mx-2">

            <img src="./fate.svg" className="h-10 cursor-pointer"/>

            <div className="flex gap-4 p-2">
                <ZoomDropdown canvas={canvas} />

                <DownloadMenu canvas={canvas} />

                {/*<Fullscreen canvas={canvas} />*/}

                <IconButton
                    icon={<i className="fa-solid fa-floppy-disk text-lg"></i>}
                    onClick={handleClick}
                    title="Save Board" />

                <IconButton
                    icon={<i className="fa-solid fa-square-xmark text-lg"></i>}
                    onClick={clearClick}
                    title="Clear Board" />
            </div>

        </div>
    </header>
}