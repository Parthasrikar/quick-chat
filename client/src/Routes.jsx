import { useContext } from "react";
import Register from "./RegisterandLogin";
import { UserContext } from "./User";
import Chat from "./Chat";

export default function Routes() {
    const {username, id} = useContext(UserContext)

    if (username) {
        return <Chat/>
    }

    return (
        <Register></Register>
    )
}