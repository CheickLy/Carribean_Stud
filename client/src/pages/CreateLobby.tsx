import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CreateLobby.css";


type Visibility = "public" | "private";

type LobbySettings = {
  name: string;
  visibility: Visibility;
  password: string;
  maxPlayers: number;
  startingMoney: number;
  minBet: number;
  maxBet: number;
  botsEnabled: boolean;
  autoIncrease: boolean;
  increaseAmount: number;
  increaseEveryHands: number;
};

const initialSettings: LobbySettings = {
  name: "",
  visibility: "public",
  password: "",
  maxPlayers: 6,
  startingMoney: 200,
  minBet: 10,
  maxBet: 250,
  botsEnabled: false,
  autoIncrease: false,
  increaseAmount: 10,
  increaseEveryHands: 15,
};

export default function CreateLobby() {
 const navigate = useNavigate();
  const [settings, setSettings] =
    useState<LobbySettings>(initialSettings);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update<K extends keyof LobbySettings>(
    key: K,
    value: LobbySettings[K]
  ) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
    setError("");
    setSuccess("");
  }

 async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = settings.name.trim();

    if (name.length < 3 || name.length > 40) {
      setError("Lobby name must be between 3 and 40 characters.");
      return;
    }

    if (
      settings.visibility === "private" &&
      !settings.password.trim()
    ) {
      setError("Please enter a password for your private lobby.");
      return;
    }

    if (
      !Number.isInteger(settings.maxPlayers) ||
      settings.maxPlayers < 2 ||
      settings.maxPlayers > 6
    ) {
      setError("A lobby must have between 2 and 6 player seats.");
      return;
    }

    if (
      !Number.isInteger(settings.minBet) ||
      !Number.isInteger(settings.maxBet) ||
      !Number.isInteger(settings.startingMoney) ||
      settings.minBet <= 0 ||
      settings.maxBet < settings.minBet ||
      settings.startingMoney < settings.minBet
    ) {
      setError("Check your minimum bet, maximum bet, and starting balance.");
      return;
    }

    if (
      settings.autoIncrease &&
      (!Number.isInteger(settings.increaseAmount) ||
        !Number.isInteger(settings.increaseEveryHands) ||
        settings.increaseAmount <= 0 ||
        settings.increaseEveryHands < 1)
    ) {
      setError("Automatic increases must use positive whole numbers.");
      return;
    }

   try {
  const response = await fetch("http://localhost:3001/api/lobbies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      name: settings.name.trim(),
      maxPlayers: settings.maxPlayers,
      startingMoney: settings.startingMoney,
      minBet: settings.minBet,
      maxBet: settings.maxBet,
      isPrivate: settings.visibility === "private",
      passcode: settings.visibility === "private" ? settings.password : undefined,
      botsEnabled: settings.botsEnabled,
      autoIncr: settings.autoIncrease,
      increaseAmount: settings.increaseAmount,
      increaseEveryHands: settings.increaseEveryHands,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.errors?.join(" ") ||
        "Unable to create your table."
    );
  }

  if (!Number.isInteger(data.lobbyId) || data.lobbyId <= 0) {
  throw new Error("Table created, but the server did not return a valid lobby ID.");
}

navigate(`/lobbies/${data.lobbyId}/invite`);
} catch (error) {
  setError(
    error instanceof Error
      ? error.message
      : "Something went wrong while creating your table."
  );
}
    
  }

  return (
    <div className="reef-create-page">
      <div className="reef-create-container">
        <a className="reef-back-link" href="/lobbies">
          <span aria-hidden="true">←</span> Back to lobbies
        </a>

        <div className="reef-page-intro">
          <div>
            <h1>Your table. Your kind of company.</h1>
            <p>
              Set the pace, choose your people, and let the dealer
              take it from there.
            </p>
          </div>
          <span className="reef-free-badge">FREE-PLAY LOBBY</span>
        </div>

        <div className="reef-create-grid">
          <form
            id="reef-create-form"
            className="reef-settings-card"
            onSubmit={handleSubmit}
          >
            <section className="reef-form-section">
              <div className="reef-section-heading">
                <span className="reef-section-number">01</span>
                <div>
                  <h2>Give your table a name</h2>
                  <p>
                    Something your friends can spot in the lobby browser.
                  </p>
                </div>
              </div>

              <div className="reef-field">
                <label htmlFor="reef-name">Lobby name</label>
                <input
                  id="reef-name"
                  type="text"
                  placeholder="Enter your lobby name"
                  value={settings.name}
                  onChange={(event) =>
                    update("name", event.target.value)
                  }
                  minLength={3}
                  maxLength={40}
                  required
                />
                <span className="reef-help">
                  3–40 characters · Keep it friendly.
                </span>
              </div>
            </section>

            <section className="reef-form-section">
              <div className="reef-section-heading">
                <span className="reef-section-number">02</span>
                <div>
                  <h2>Who's coming over?</h2>
                  <p>
                    Choose who can find and join your table.
                  </p>
                </div>
              </div>

              <div className="reef-visibility-grid">
                <button
                  type="button"
                  className={`reef-visibility-option ${
                    settings.visibility === "public" ? "is-selected" : ""
                  }`}
                  aria-pressed={settings.visibility === "public"}
                  onClick={() => update("visibility", "public")}
                >
                  <span className="reef-visibility-symbol">◎</span>
                  <span className="reef-option-content">
                    <strong>Public</strong>
                    <small>Anyone can find your table.</small>
                  </span>
                  <span className="reef-radio-dot" />
                </button>

                <button
                  type="button"
                  className={`reef-visibility-option ${
                    settings.visibility === "private" ? "is-selected" : ""
                  }`}
                  aria-pressed={settings.visibility === "private"}
                  onClick={() => update("visibility", "private")}
                >
                  <span className="reef-visibility-symbol">♧</span>
                  <span className="reef-option-content">
                    <strong>Private</strong>
                    <small>Only people with the password.</small>
                  </span>
                  <span className="reef-radio-dot" />
                </button>
              </div>

              {settings.visibility === "private" && (
                <div className="reef-field reef-password-field">
                  <label htmlFor="reef-password">Lobby password</label>
                  <input
                    id="reef-password"
                    type="password"
                    placeholder="Create a password"
                    value={settings.password}
                    onChange={(event) =>
                      update("password", event.target.value)
                    }
                    required
                  />
                  <span className="reef-help">
                    Share this with players you want to invite.
                  </span>
                </div>
              )}

              <div className="reef-seats-row">
                <div className="reef-seats-block">
                  <label>Maximum players</label>
                  <div
                    className="reef-seat-buttons"
                    role="group"
                    aria-label="Maximum players"
                  >
                    {[2, 3, 4, 5, 6].map((count) => (
                      <button
                        key={count}
                        type="button"
                        className={
                          settings.maxPlayers === count
                            ? "is-selected"
                            : ""
                        }
                        aria-pressed={settings.maxPlayers === count}
                        onClick={() => update("maxPlayers", count)}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                  <span className="reef-help">
                    Spectators don't take up player seats.
                  </span>
                </div>

                <div className="reef-bots-block">
                  <label className="reef-switch-row">
                    <span className="reef-switch-text">
                      <strong>Allow bots</strong>
                      <small>Fill empty player seats</small>
                    </span>
                    <input
                      type="checkbox"
                      className="reef-switch-input"
                      checked={settings.botsEnabled}
                      onChange={(event) =>
                        update("botsEnabled", event.target.checked)
                      }
                    />
                    <span className="reef-switch-track" />
                  </label>
                </div>
              </div>
            </section>

            <section className="reef-form-section">
              <div className="reef-section-heading">
                <span className="reef-section-number">03</span>
                <div>
                  <h2>Set a comfortable pace</h2>
                  <p>
                    All bets use virtual points, not real money.
                  </p>
                </div>
              </div>

              <div className="reef-betting-grid">
                <div className="reef-field">
                  <label htmlFor="reef-min-bet">
                    Minimum bet
                  </label>
                  <div className="reef-number-wrapper">
                    <input
                      id="reef-min-bet"
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={settings.minBet}
                      onChange={(event) =>
                        update("minBet", Number(event.target.value))
                      }
                    />
                    <span>pts</span>
                  </div>
                </div>

                <div className="reef-field">
                  <label htmlFor="reef-max-bet">
                    Maximum bet
                  </label>
                  <div className="reef-number-wrapper">
                    <input
                      id="reef-max-bet"
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={settings.maxBet}
                      onChange={(event) =>
                        update("maxBet", Number(event.target.value))
                      }
                    />
                    <span>pts</span>
                  </div>
                </div>

                <div className="reef-field">
                  <label htmlFor="reef-starting-money">
                    Starting balance
                  </label>
                  <div className="reef-number-wrapper">
                    <input
                      id="reef-starting-money"
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={settings.startingMoney}
                      onChange={(event) =>
                        update(
                          "startingMoney",
                          Number(event.target.value)
                        )
                      }
                    />
                    <span>pts</span>
                  </div>
                </div>
              </div>

              <div className="reef-increase-panel">
                <label className="reef-switch-row">
                  <span className="reef-switch-text">
                    <strong>Automatic bet increases</strong>
                    <small>
                      Gradually raise the minimum bet between hands.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    className="reef-switch-input"
                    checked={settings.autoIncrease}
                    onChange={(event) =>
                      update("autoIncrease", event.target.checked)
                    }
                  />
                  <span className="reef-switch-track" />
                </label>

                {settings.autoIncrease && (
                  <>
                    <div className="reef-increase-fields">
                      <div className="reef-field">
                        <label htmlFor="reef-increase-amount">
                          Increase by
                        </label>
                        <div className="reef-number-wrapper">
                          <input
                            id="reef-increase-amount"
                            type="number"
                            min={1}
                            step={1}
                            required
                            value={settings.increaseAmount}
                            onChange={(event) =>
                              update(
                                "increaseAmount",
                                Number(event.target.value)
                              )
                            }
                          />
                          <span>pts</span>
                        </div>
                      </div>

                      <div className="reef-field">
                        <label htmlFor="reef-increase-hands">
                          Every
                        </label>
                        <div className="reef-number-wrapper">
                          <input
                            id="reef-increase-hands"
                            type="number"
                            min={1}
                            step={1}
                            required
                            value={settings.increaseEveryHands}
                            onChange={(event) =>
                              update(
                                "increaseEveryHands",
                                Number(event.target.value)
                              )
                            }
                          />
                          <span>hands</span>
                        </div>
                      </div>
                    </div>

                    <p className="reef-increase-note">
                      Increases only occur between completed hands and
                      never exceed the maximum bet.
                    </p>
                  </>
                )}
              </div>
            </section>
          </form>

          <aside className="reef-sidebar">
            <div className="reef-preview-card">
              <div className="reef-preview-top">
                <div className="reef-preview-topline">
                  <span className="reef-preview-label">
                    YOUR TABLE PREVIEW
                  </span>
                  <span className="reef-preview-status">
                    {settings.visibility === "private"
                      ? "Private"
                      : "Public"}
                  </span>
                </div>

                <h2>
                  {settings.name.trim() || "Your lobby name"}
                </h2>
                <p>Hosted by you</p>
              </div>

              <div className="reef-preview-body">
                <div className="reef-preview-detail">
                  <span>Player seats</span>
                  <strong>
                    Up to {settings.maxPlayers} · Bots{" "}
                    {settings.botsEnabled ? "on" : "off"}
                  </strong>
                </div>

                <div className="reef-preview-detail">
                  <span>Bet range</span>
                  <strong>
                    {settings.minBet}–{settings.maxBet} pts
                  </strong>
                </div>

                <div className="reef-preview-detail">
                  <span>Starting balance</span>
                  <strong>{settings.startingMoney} pts</strong>
                </div>

                <div className="reef-preview-detail">
                  <span>Automatic increases</span>
                  <strong>
                    {settings.autoIncrease
                      ? `+${settings.increaseAmount} pts every ${settings.increaseEveryHands} hands`
                      : "Off"}
                  </strong>
                </div>

                <div className="reef-preview-detail">
                  <span>Spectators</span>
                  <strong>
                    Unlimited ·{" "}
                    {settings.visibility === "private"
                      ? "Password required"
                      : "Public access"}
                  </strong>
                </div>

                <button
                  className="reef-create-button"
                  type="submit"
                  form="reef-create-form"
                >
                  Create lobby &amp; take a seat
                  <span aria-hidden="true">→</span>
                </button>

                <p className="reef-preview-footnote">
                  You can invite friends once your table is open.
                </p>
              </div>
            </div>

            <div className="reef-host-tip">
              <span className="reef-tip-icon" aria-hidden="true">✦</span>
              <div>
                <h3>A good host keeps it easy.</h3>
                <p>
                  Start with friendly betting limits and invite
                  your crew when you're ready to play.
                </p>
              </div>
            </div>

            <a href="/lobbies" className="reef-cancel-link">
              Cancel and go back
            </a>
          </aside>
        </div>

        {error && (
          <p className="reef-form-message reef-error" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="reef-form-message reef-success" role="status">
            {success}
          </p>
        )}
      </div>
    </div>
  );
}
