// import Register from "./Register";
import Routes from "./Routes";
import axios from "axios";
import {UserContextProvider} from "./User";
function App() {
  axios.defaults.baseURL = "http://localhost:3000";
  axios.defaults.withCredentials = true;

  return (
    <>
      <UserContextProvider>
        <Routes></Routes>
      </UserContextProvider>
    </>
  );
}

export default App;
