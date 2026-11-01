import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getFriends, type Friend } from "../services/friends";
import { sendLobbyInvitation } from "../services/invitations";
import "../styles/Friends.css";

export default function InviteFriends() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [invitedIds, setInvitedIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");

  const id = Number(lobbyId);

  useEffect(() => {
    let active = true;

    async function loadFriends() {
      try {
        const data = await getFriends();
        if (active) setFriends(data);
      } catch (error) {
        if (active) {
          setMessage(
            error instanceof Error ? error.message : "Failed to load friends."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFriends();

    return () => {
      active = false;
    };
  }, []);

  async function handleInvite(friend: Friend) {
    if (!Number.isInteger(id) || id <= 0) {
      setMessage("Invalid table ID.");
      return;
    }

    setBusyId(friend.userId);
    setMessage("");

    try {
      await sendLobbyInvitation(id, friend.userId);
      setInvitedIds((previous) => [...previous, friend.userId]);
      setMessage(`Invitation sent to ${friend.username}!`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to send invitation."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="friends-page">
    <main className="friends-container">
      <Link className="friends-back" to="/lobbies">← Back to tables</Link>
      <header className="friends-header">
        <div><h1>Invite your crew.</h1>
        <p>Bring your friends to the table.</p></div>
      </header>

      <section className="friends-card">
        <h2>Table #{lobbyId}</h2>
        <p>Invite your accepted friends to join your table.</p>
      </section>

      {message && (
        <p className="friends-message" role="status">
          {message}
        </p>
      )}

      <section className="friends-card">
        <h2>Your Friends ({friends.length})</h2>

        {loading ? (
          <p>Loading friends...</p>
        ) : friends.length === 0 ? (
          <p>
            You haven't added any friends yet.{" "}
            <Link to="/friends">Find friends</Link>
          </p>
        ) : (
          <ul className="friends-list">
            {friends.map((friend) => {
              const invited = invitedIds.includes(friend.userId);

              return (
                <li key={friend.friendshipId} className="friend-row">
                  <span>{friend.username}</span>

                  <button
                    type="button"
                    disabled={busyId !== null || invited}
                    onClick={() => void handleInvite(friend)}
                  >
                    {invited
                      ? "Invited"
                      : busyId === friend.userId
                        ? "Sending..."
                        : "Invite"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link to="/lobbies">← Back to Tables</Link>
    </main>
    </div>
  );
}