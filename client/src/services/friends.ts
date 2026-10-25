const API_URL = "http://localhost:3001/api/friends";

export interface Friend {
    friendshipId: number;
    userId: number;
    username: string;   
}

export interface FriendRequest {
    friendshipId: number;
    senderId: number;
    senderUsername: string;
    status: string;
}

export interface SentFriendRequest {
    friendshipId: number;
    recipientId: number;
    recipientUsername: string;
    status: string;
}
async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });
    const data = await response.json();

    if (!response.ok){
        throw new Error(
            data.error || data.message || "Error has occured"
        );
    }

return data as T;
}
export async function getFriends(): Promise<Friend[]> {
    return request<Friend[]>("");
}
export async function getPendingRequests(): Promise<FriendRequest[]> {
    return request<FriendRequest[]>("/requests");
}
export async function sendFriendRequest(
    username: string
): Promise<SentFriendRequest> {
    return request<SentFriendRequest>("/requests", {
        method: "POST",
        body: JSON.stringify({ username }),
    });
}
export async function respondToFriendRequest(
    friendshipId: number,
    action: "accept" | "reject"
): Promise<{ friendshipId: number; status: string }> {
    return request(`/requests/${friendshipId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
    });
}
export async function removeFriendship(
    friendshipId: number
): Promise<{ message: string }> {
    return request( `/${friendshipId}`, {
        method: "DELETE",
    });
}
