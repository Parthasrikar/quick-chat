import { TfiJoomla } from "react-icons/tfi";
import { LuExternalLink } from "react-icons/lu";
import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "./User";

export default function RegisterandLogin() {
  const [username, setusername] = useState("");
  const [password, setpassword] = useState("");
  const [isloginorregister, setisloginorregister] = useState("register");

  const { setUsername, setid } = useContext(UserContext);

  async function handleSubmit(ev) {
    ev.preventDefault();
    const url = isloginorregister === 'register' ? 'register' : 'login';
    const {data} = await axios.post(url, {username,password});
    setUsername(username);
    setid(data.id);
  }

  return (
    <div className="h-screen w-full flex items-center bg-indigo-200/65">
      <div className="mx-auto w-1/3 flex-col justify-center items-center px-8 pt-10 pb-8 rounded-2xl bg-white/90 shadow-indigo-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center justify-center gap-1.5">
            <TfiJoomla className="text-4xl font-extrabold text-indigo-400" />
            <h2 className="text-xl font-semibold text-indigo-400">
              Quick chat
            </h2>
          </div>
          {isloginorregister === "register" && (
            <button
              className="text-lg underline flex items-center gap-0.5 text-indigo-300 cursor-pointer"
              onClick={() => setisloginorregister("login")}
            >
              <LuExternalLink />
              {isloginorregister === "register" ? "log-in" : "Register"}
            </button>
          )}

          {isloginorregister === "login" && (
            <button
              className="text-lg underline flex items-center gap-0.5 text-indigo-300 cursor-pointer"
              onClick={() => setisloginorregister("register")}
            >
              <LuExternalLink />
              {isloginorregister === "register" ? "log-in" : "Register"}
            </button>
          )}
        </div>
        <h1 className="text-4xl font-stretch-90% p-3 text-left mt-2 mb-3 text-indigo-500">
          {isloginorregister === "register" ? "Register" : "Login"}
        </h1>
        <form className="mt-4" onSubmit={handleSubmit}>
          <input
            className="w-full bg-white p-2 mb-3 rounded-md border border-indigo-200 text-indigo-400"
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setusername(e.target.value)}
          />
          <input
            className="w-full bg-white p-2 mb-3 rounded-md border border-indigo-200 text-indigo-400"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setpassword(e.target.value)}
          />
          <button className="mt-5 py-2 px-5 bg-indigo-200/65 text-lg rounded-full font cursor-pointer text-indigo-400 flex items-center justify-center font-medium">
            {isloginorregister === "register" ? "register" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
