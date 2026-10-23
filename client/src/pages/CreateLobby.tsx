import { useState } from "react";
type LobbyVisibility = "public" | "private";

interface LobbySettings {
    name: string;
    visibility: LobbyVisibility;
    password: string;
    maxPlayers: number;
    startingBalance: number;
    minBet: number;
    maxBet: number;
}

export default function CreateLobby() {
    const [settings, setSettings] = useState<LobbySettings>({
        name: "",
        visibility: "public",
        password: "",
        maxPlayers: 6,
        startingBalance: 1000,
        minBet: 10,
        maxBet: 100,
    });

    function updateSetting<K extends keyof LobbySettings>(
        key: K, 
        value: LobbySettings[K]
    ) {
        setSettings((previous) => ({
            ...previous,
            [key]: value,
        }));
        }

        function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
            event.preventDefault();
            console.log("Lobby settings:", settings);

    }
    return (
        <main className="create-lobby">
            <h1>Create a Lobby</h1>
            <p>Set up your Reef Royale table</p>

            <form onSubmit={handleSubmit}>
                <label htmlFor="lobby-name">Lobby Name</label>
                <input
                    id="lobby-name"
                    required
                    maxLength={50}
                    value={settings.name}
                    onChange={(event) =>
                        updateSetting("name", event.target.value)}
                />
                <label htmlFor="visibility">Visibility</label>
                <select
                    id="visibility"
                    value={settings.visibility}
                    onChange={(event) =>
                        updateSetting(
"visibility", event.target.value as LobbyVisibility)}
>
 <option value="public">Public</option>
          <option value="private">Private</option>
        </select>

        {settings.visibility === "private" && (
            <>
            <label htmlFor="lobby-password">Password</label>
            <input
                id="lobby-password"
                type="password"
                required
                value={settings.password}
                onChange={(event) =>
                    updateSetting("password", event.target.value)}
            />
            </>
        )}
        <label htmlFor="max-players">Max Players</label>
        <select
            id="max-players"
            value={settings.maxPlayers}
            onChange={(event) =>
                updateSetting("maxPlayers", Number(event.target.value))}
        >
                {[2, 3, 4, 5, 6].map((count) => (
                    <option key={count} value={count}>
                        {count} Players
                    </option>
                ))}
            </select>

            <label htmlFor="starting-balance">Starting Balance</label>
            <input
                id="starting-balance"
                type="number"
                min="1"
                required
                value={settings.startingBalance}
                onChange={(event) =>
                    updateSetting("startingBalance", Number(event.target.value))}
            />

            <label htmlFor="min-bet">Minimum Bet</label>
            <input
                id="min-bet"
                type="number"
                min="1"
                required
                value={settings.minBet}
                onChange={(event) =>
                    updateSetting("minBet", Number(event.target.value))}
            />

            <label htmlFor="max-bet">Maximum Bet</label>
            <input
                id="max-bet"
                type="number"
                min="1"
                required
                value={settings.maxBet}
                onChange={(event) =>
                    updateSetting("maxBet", Number(event.target.value))}
            />

            <button type="submit">Create Lobby</button>
            </form>
        </main>
    )
}