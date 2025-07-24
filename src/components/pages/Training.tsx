import { useState } from "react";
import { Home } from './pages/Home.tsx';
import { Training } from './pages/Training.tsx';

import { Button } from './components/atoms/Button.tsx';
import { SearchBar } from './components/molecules/SearchBar.tsx'
import { Notes } from './components/molecules/Notes.tsx'

import { SongList } from './components/organisms/SongList.tsx'

function App1() {
  // Parinda, Sayian, Co2, Dur dur kale rang nu, Chana way

  // Parinda - Mohit Chauhan, moviename, type
  // Sayian - Kailsh kher, moviename, type
  // Co2 - betal, moviename, album
  // Dur dur - kaka, moviename, album
  // Chana Way - Arjit, moviename, movie


  const [songs, setSongs] = useState([
    { id: 1, name: 'Parinda', singer: 'Mohit Chauhan', isFav: false },
    { id: 2, name: 'Sayian', singer: 'Kailsh Kher', isFav: false },
    { id: 3, name: 'Co2', singer: 'Bital', isFav: false },
    { id: 4, name: 'Dur Dur', singer: 'kaka', isFav: false }
  ]);

  const [newSong, setNewSong] = useState('');

  const addNewSong = () => {
    if (newSong) {
      setSongs([...songs, newSong])
      setNewSong('')
    }
  }

  const updateAndAddNewSong = (e) => {
    setNewSong(e.target.value);
  }

  const [isFav, setIsFav] = useState(false);

  const handleFavSong = (id) => {
    setSongs(songs => songs.map(song => song.id === id ? { ...song, isFav: !song.isFav } : song));
  }

  const mySongsList = songs.map(song => {
    return <li className="flex flex-row justify-between items-center bg-gray-200 p-2 border-b border-grey-300">

        <div className="flex">
            <img className="h-20" src={"https://m.media-amazon.com/images/M/MV5BMWJlN2U5MzItNjU4My00NTM2LWFjOWUtOWFiNjg3ZTMxZDY1XkEyXkFqcGc@._V1_QL75_UY107_CR7,0,72,107_.jpg"} />
            <div className="flex flex-col p-4">
                <div>{song.name}</div>
                <div>{song.singer}</div>
            </div>
        </div>

        <div className="flex flex-row items-center">
            <div onClick={() => handleFavSong(song.id) }>
              { song.isFav ?
                <i className="fa-solid fa-heart text-xl p-4 text-red-400"></i>
                : <i className="fa-light fa-heart text-xl p-4"></i>
              }
            </div>
            <div>
              <i className="fa-solid fa-ellipsis"></i>
            </div>
        </div>
      </li>
    })

    return (
      <>
        <div className="flex flex-col gap-4 justify-center m-4">
          <SearchBar />
          <ul>
            { mySongsList }
          </ul>
        </div>
      </>
    )
  }

  export default App
  