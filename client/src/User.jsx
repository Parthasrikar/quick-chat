import axios from "axios";
import { createContext, useEffect, useState } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export const UserContext = createContext({});

// eslint-disable-next-line react/prop-types
export function UserContextProvider({children}) {
    const [username, setUsername] = useState(null);
    const [id, setid] = useState(null);

    useEffect(()=> {
        axios.get('/profile', { withCredentials: true }).then(res => {
            setUsername(res.data.username);
            setid(res.data.id);
        })
    },[])

    return (
        <UserContext.Provider value={{username, setUsername, id, setid}}>
            {children}
        </UserContext.Provider>
    )
}