import LoginSection from "./components/LoginSection";
import CreateLobby from "./pages/CreateLobby";

export default function App() {
    if(window.location.pathname === "/create-lobby") {
        return <CreateLobby />;
    }
    return <LoginSection />;

}