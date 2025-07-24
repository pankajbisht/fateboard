import { useState } from 'react';

import { SearchBar } from '../molecules/SearchBar';
import { List } from '../molecules/List';


export const Todo = () => {

    const [list, setList] = useState([
        { id: 1, task: 'mujhe sujal ko padhana hai' }
    ]);

    const [task, setTask] = useState('');

    const handleClick = () => {
        if (task) {
            setList(preList => [...preList, { id: preList[preList.length - 1].id + 1, task }]);
            setTask('');
        }
    }

    const handleDeleteClick = (id) => {
        setList(preList => preList.filter(list => list.id !== id));
    }

    const handleChange = (e) => {
        setTask(e.target.value)
    }

    return <>
       <div className="flex flex-col p-10">
           <div className="flex my-5">
               <SearchBar value={task} placeholder={"Add New Task"} onChange={handleChange} onAdd={() => handleClick() } />
           </div>

           <div>
               <List list={list} onClick={handleDeleteClick} />
           </div>
       </div>
    </>
}