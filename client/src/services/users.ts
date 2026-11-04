const API_URL = "/api/users";

export const AVATARS = [
  { id: "wave", label: "Ocean Wave", symbol: "🌊" },
  { id: "turtle", label: "Sea Turtle", symbol: "🐢" },
  { id: "dolphin", label: "Dolphin", symbol: "🐬" },
  { id: "octopus", label: "Octopus", symbol: "🐙" },
  { id: "shark", label: "Shark", symbol: "🦈" },
  { id: "crab", label: "Crab", symbol: "🦀" },
  { id: "penguin", label: "Penguin", symbol: "🐧" },
  { id: "seal", label: "Seal", symbol: "🦭" },
  { id: "whale", label: "Whale", symbol: "🐳" },
  { id: "jellyfish", label: "Jellyfish", symbol: "🪼" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export interface AdminUser {
  userId: number;
  username: string;
  email: string;
  role: string;
  topupCount: number;
  isGuest: boolean;
  isBanned: boolean;
  balance: string;
  createdAt: string;
}

export async function setUserBanned(
  userId: number,
  isBanned: boolean
): Promise<AdminUser> {
  const response = await fetch(`${API_URL}/${userId}/ban`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ isBanned }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not update ban status");
  }

  return data;
}

export async function updateUserAccount(
  userId: number,
  username: string,
  email: string
): Promise<AdminUser> {
  const response = await fetch(`${API_URL}/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, email }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Could not update account");
  }
  return data;
}

export async function deleteUserAccount(userId: number): Promise<void> {
  const response = await fetch(`${API_URL}/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Could not delete account");
  }
}

export async function listUsers(): Promise<AdminUser[]> {
  const response = await fetch(API_URL, { credentials: "include" });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load users");
  }

  return data;
}

export async function updateAvatar(avatar: string) {
  const response = await fetch(`${API_URL}/me/avatar`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ avatar }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not update avatar");
  }

  return data.user as { userId: number; username: string; avatar: string };
}
