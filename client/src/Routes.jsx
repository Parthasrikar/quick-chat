/* eslint-disable no-unused-vars */
import { useContext } from "react";
import RegisterAndLogin from "./RegisterAndLogin.jsx";
import { UserContext } from "./User";
import Chat from "./Chat";

export default function Routes() {
  const { username, id } = useContext(UserContext);

  if (username) {
    return <Chat />;
  }

  return <RegisterAndLogin />;
}