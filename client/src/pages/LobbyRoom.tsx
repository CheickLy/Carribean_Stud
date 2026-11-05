import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getFriends, type Friend } from "../services/friends";
import { sendLobbyInvitation } from "../services/invitations";
import "../styles/LobbyRoom.css";

type Room = {
  lobbyId: number; name: string; isPrivate: boolean; isHost: boolean;
  waitingForNextHand: boolean; handInProgress: boolean;
  maxPlayers: number; seatsAvailable: number; startingMoney: string;
  minBet: string; maxBet: string; botsEnabled: boolean;
  players: { userId: number; username: string; isHost: boolean; waitingForNextHand: boolean }[];
};

export default function LobbyRoom() {
  const { lobbyId } = useParams();
  const location = useLocation();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [invited, setInvited] = useState<number[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setRoom(null);
    setError("");
    setInvited([]);
    async function refresh() {
      try {
        const response = await fetch(`/api/lobbies/${lobbyId}`, {
          credentials: "include", signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load your table.");
        setRoom(data);
        setError("");
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load your table.");
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [lobbyId]);

  async function openInvites() {
    dialog.current?.showModal();
    setInviteMessage("");
    setFriendsLoading(true);
    try { setFriends(await getFriends()); }
    catch (error) { setInviteMessage(error instanceof Error ? error.message : "Unable to load friends."); }
    finally { setFriendsLoading(false); }
  }

  async function invite(friend: Friend) {
    setBusyId(friend.userId);
    setInviteMessage("");
    try {
      await sendLobbyInvitation(Number(lobbyId), friend.userId);
      setInvited(previous => [...previous, friend.userId]);
      setInviteMessage(`Invitation sent to ${friend.username}.`);
    } catch (error) { setInviteMessage(error instanceof Error ? error.message : "Unable to send invitation."); }
    finally { setBusyId(null); }
  }

  return <div className="room-page"><main className="room-container">
    <Link className="room-back" to="/lobbies">← Back to tables</Link>
    {error && <p className="room-error" role="alert">{error}</p>}
    {!room && !error && <p role="status">Getting your table ready…</p>}
    {room && <>
      {location.state?.created && <p className="room-success" role="status">✓ Table created. Your seat is ready.</p>}
      {room.waitingForNextHand && <p className="room-success" role="status">Your seat is reserved. You will join the next hand.</p>}
      {location.state?.joined && !room.waitingForNextHand && <p className="room-success" role="status">You joined the table. Your seat is ready.</p>}
      <header className="room-heading">
        <div><span className="room-eyebrow">YOUR TABLE · {room.isPrivate ? "PRIVATE" : "PUBLIC"}</span><h1>{room.name}</h1><p>Settle in. Good company makes a good game.</p></div>
        <span className="room-status">{room.handInProgress ? "Hand in progress" : "Waiting for players"}</span>
      </header>
      <div className="room-layout">
        <section className="room-card room-players" aria-labelledby="room-players-title">
          <div className="room-section-heading"><div><h2 id="room-players-title">At the table</h2><p>{room.players.length} of {room.maxPlayers} seats filled</p></div>{room.isHost && <button className="room-primary" onClick={() => void openInvites()} disabled={room.seatsAvailable === 0}>+ Invite friends</button>}</div>
          <div className="room-seats">
            {room.players.map(player => <div className="room-seat" key={player.userId}><span className="room-avatar" aria-hidden="true">{player.username.charAt(0).toUpperCase()}</span><strong>{player.username}</strong><span>{player.isHost ? "Host" : "Player"}</span><small>{player.waitingForNextHand ? "Waiting for next hand" : "Seated"}</small></div>)}
            {Array.from({ length: room.seatsAvailable }, (_, index) => <div className="room-seat room-seat-empty" key={`empty-${index}`}><span className="room-avatar" aria-hidden="true">♧</span><strong>Open seat</strong><span>Room for one more</span></div>)}
          </div>
          <p className="room-note">Players appear here when they join or accept an invitation.</p>
        </section>
        <aside className="room-card room-settings"><span className="room-eyebrow">THE GAME PLAN</span><h2>Table settings</h2>
          <dl><div><dt>Starting chips</dt><dd>{Number(room.startingMoney).toLocaleString()}</dd></div><div><dt>Bet range</dt><dd>{Number(room.minBet).toLocaleString()}–{Number(room.maxBet).toLocaleString()} chips</dd></div><div><dt>Available seats</dt><dd>{room.seatsAvailable}</dd></div><div><dt>Bots</dt><dd>{room.botsEnabled ? "Allowed" : "Off"}</dd></div></dl>
          <Link className="room-primary room-start room-preview-link" to={`/lobbies/${lobbyId}/game`} state={{ tableName: room.name }}>Play hand →</Link><p className="room-note">Five cards are dealt to you and the dealer. The table shows each hand's rank.</p>
        </aside>
      </div>
    </>}
    <dialog className="room-dialog" ref={dialog} aria-labelledby="room-invite-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="room-section-heading"><div><span className="room-eyebrow">BETTER WITH FRIENDS</span><h2 id="room-invite-title">Invite your crew</h2></div><button className="room-close" aria-label="Close invitations" onClick={() => dialog.current?.close()}>×</button></div>
      <p>Send a table invitation to your friends. They can accept it from Friends &amp; invitations.</p>
      {inviteMessage && <p role="status" className="room-invite-message">{inviteMessage}</p>}
      {friendsLoading ? <p role="status">Loading friends…</p> : friends.length === 0 ? <p>No friends yet. <Link to="/friends">Find your friends →</Link></p> : <ul className="room-friends">{friends.map(friend => {
        const seated = room?.players.some(player => player.userId === friend.userId);
        const sent = invited.includes(friend.userId);
        return <li key={friend.userId}><span className="room-avatar" aria-hidden="true">{friend.username.charAt(0).toUpperCase()}</span><strong>{friend.username}</strong><button className="room-primary" disabled={busyId !== null || sent || seated || room?.seatsAvailable === 0} onClick={() => void invite(friend)}>{seated ? "Seated" : sent ? "Invited" : busyId === friend.userId ? "Sending…" : "Invite"}</button></li>;
      })}</ul>}
      <button className="room-done" onClick={() => dialog.current?.close()}>Done</button>
    </dialog>
  </main></div>;
}
