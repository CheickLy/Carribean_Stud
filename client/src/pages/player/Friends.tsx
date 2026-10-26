import { useEffect, useState, type FormEvent } from "react";
import {
  getFriends,
  getPendingRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriendship,
  type Friend,
  type FriendRequest,
} from "../../services/friends";
import "../../styles/Friends.css";
import {
  getIncomingInvitations,
  respondToLobbyInvitation,
  type LobbyInvitation,
} from "../../services/invitations";

export default function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [invitations, setInvitations] = useState<LobbyInvitation[]>([]);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  

  async function loadFriends() {
    try {
      const [friendsData, requestsData, invitationsData] = await Promise.all([
  getFriends(),
  getPendingRequests(),
  getIncomingInvitations(),
]);

setFriends(friendsData);
setRequests(requestsData);
setInvitations(invitationsData);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to load friends."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFriends();
  }, []);

  async function handleAddFriend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);

    try {
      await sendFriendRequest(username);
      setMessage("Friend request sent successfully!");
      setUsername("");
      await loadFriends();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to send request."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRespond(
    friendshipId: number,
    action: "accept" | "reject"
  ) {
    setMessage("");
    setBusy(true);

    try {
      await respondToFriendRequest(friendshipId, action);
      setMessage(
        action === "accept"
          ? "Friend request accepted!"
          : "Friend request rejected."
      );
      await loadFriends();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to update request."
      );
    } finally {
      setBusy(false);
    }
  }
  async function handleInvitation(
  invitationId: number,
  action: "accept" | "decline"
) {
  setMessage("");
  setBusy(true);

  try {
    await respondToLobbyInvitation(invitationId, action);

    setMessage(
      action === "accept"
        ? "Table invitation accepted! You've joined the table."
        : "Table invitation declined."
    );

    await loadFriends();
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "Failed to respond to table invitation."
    );
  } finally {
    setBusy(false);
  }
}

  async function handleRemove(friendshipId: number) {
    setMessage("");
    setBusy(true);

    try {
      await removeFriendship(friendshipId);
      setMessage("Friend removed successfully.");
      await loadFriends();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to remove friend."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="friends-page">
      <header className="friends-header">
        <p className="friends-eyebrow">REEF ROYALE</p>
        <h1>Friends</h1>
        <p>Connect with other players and build your crew.</p>
      </header>

      <section className="friends-card">
        <h2>Add a Friend</h2>

        <form onSubmit={handleAddFriend} className="add-friend-form">
          <label htmlFor="friend-username">Username</label>

          <div className="add-friend-controls">
            <input
              id="friend-username"
              type="text"
              placeholder="Enter a username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />

            <button type="submit" disabled={busy}>
              Send Request
            </button>
          </div>
        </form>
      </section>

      {message && (
        <p className="friends-message" role="status">
          {message}
        </p>
      )}

      <section className="friends-card">
        <h2>Friend Requests ({requests.length})</h2>

        {loading ? (
          <p>Loading requests...</p>
        ) : requests.length === 0 ? (
          <p>No pending friend requests.</p>
        ) : (
          <ul className="friends-list">
            {requests.map((request) => (
              <li key={request.friendshipId} className="friend-row">
                <span>{request.senderUsername}</span>

                <div className="friend-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      handleRespond(request.friendshipId, "accept")
                    }
                  >
                    Accept
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={busy}
                    onClick={() =>
                      handleRespond(request.friendshipId, "reject")
                    }
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
<section className="friends-card">
  <h2>Table Invitations ({invitations.length})</h2>

  {loading ? (
    <p>Loading table invitations...</p>
  ) : invitations.length === 0 ? (
    <p>No pending table invitations.</p>
  ) : (
    <ul className="friends-list">
      {invitations.map((invitation) => (
        <li
          key={invitation.invitationId}
          className="friend-row"
        >
          <span>
            <strong>{invitation.sender.username}</strong> invited you
            to join <strong>{invitation.lobby.name}</strong>
          </span>

          <div className="friend-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                handleInvitation(invitation.invitationId, "accept")
              }
            >
              Accept
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() =>
                handleInvitation(invitation.invitationId, "decline")
              }
            >
              Decline
            </button>
          </div>
        </li>
      ))}
    </ul>
  )}
</section>
      <section className="friends-card">
        <h2>My Friends ({friends.length})</h2>

        {loading ? (
          <p>Loading friends...</p>
        ) : friends.length === 0 ? (
          <p>You haven't added any friends yet.</p>
        ) : (
          <ul className="friends-list">
            {friends.map((friend) => (
              <li key={friend.friendshipId} className="friend-row">
                <span>{friend.username}</span>

                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => handleRemove(friend.friendshipId)}
                >
                  Remove Friend
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}