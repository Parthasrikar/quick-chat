import { TfiJoomla } from "react-icons/tfi";
import { LuExternalLink } from "react-icons/lu";
import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "./User";

export default function RegisterAndLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("register");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { setUsername: setGlobalUsername, setId } = useContext(UserContext);

  async function handleSubmit(ev) {
    ev.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const url = isLoginOrRegister === 'register' ? 'register' : 'login';
      const { data } = await axios.post(url, { username, password });
      setGlobalUsername(username);
      setId(data.id);
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-indigo-200/65 p-4">
      <div className="w-full max-w-md flex-col justify-center items-center px-6 sm:px-8 pt-8 sm:pt-10 pb-6 sm:pb-8 rounded-2xl bg-white/90 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center justify-center gap-1.5">
            <TfiJoomla className="text-3xl sm:text-4xl font-extrabold text-indigo-400" />
            <h2 className="text-lg sm:text-xl font-semibold text-indigo-400">
              Quick Chat
            </h2>
          </div>
          <button
            className="text-sm sm:text-base underline flex items-center gap-0.5 text-indigo-300 cursor-pointer hover:text-indigo-500 transition-colors"
            onClick={() => setIsLoginOrRegister(isLoginOrRegister === "register" ? "login" : "register")}
          >
            <LuExternalLink className="text-sm" />
            {isLoginOrRegister === "register" ? "Login" : "Register"}
          </button>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-left mb-6 text-indigo-500">
          {isLoginOrRegister === "register" ? "Create Account" : "Welcome Back"}
        </h1>

        {/* Error Message */}
        {error && (
          <div className="w-full p-3 mb-4 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="w-full" onSubmit={handleSubmit}>
          <input
            className="w-full bg-white p-3 mb-4 rounded-md border border-indigo-200 text-indigo-600 placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          <input
            className="w-full bg-white p-3 mb-6 rounded-md border border-indigo-200 text-indigo-600 placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 px-5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white text-lg rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            {loading ? "Loading..." : (isLoginOrRegister === "register" ? "Create Account" : "Sign In")}
          </button>
        </form>
      </div>
    </div>
  );
}