import LoginSection from "./components/LoginSection";
import CreateLobby from "./pages/CreateLobby";
import LobbyBrowser from "./pages/LobbyBrowser";

export default function App() {
    if (window.location.pathname === "/create-lobby") {
        return <CreateLobby />;
    }

    if (window.location.pathname === "/lobbies") {
        return <LobbyBrowser />;
    }

    return <LoginSection />;
}