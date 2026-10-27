const API_URL = "http://localhost:3001/api/invitations";

export interface LobbyInvitation {
  invitationId: number;
  lobbyId: number;
  senderId: number;
  recipientId: number;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  lobby: {
    lobbyId: number;
    name: string;
    isPrivate: boolean;
    maxPlayers: number;
  };
  sender: {
    userId: number;
    username: string;
  };
}

async function handleResponse(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

export async function sendLobbyInvitation(
  lobbyId: number,
  recipientId: number
) {
  const response = await fetch(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lobbyId,
      recipientId,
    }),
  });

  return handleResponse(response);
}

export async function getIncomingInvitations(): Promise<LobbyInvitation[]> {
  const response = await fetch(API_URL, {
    credentials: "include",
  });

  return handleResponse(response);
}

export async function respondToLobbyInvitation(
  invitationId: number,
  action: "accept" | "decline"
) {
  const response = await fetch(`${API_URL}/${invitationId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
  });

  return handleResponse(response);
}