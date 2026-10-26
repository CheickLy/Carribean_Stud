const API_URL = "http://localhost:3001/api/users";

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

export async function listUsers(): Promise<AdminUser[]> {
  const response = await fetch(API_URL, { credentials: "include" });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load users");
  }

  return data;
}
