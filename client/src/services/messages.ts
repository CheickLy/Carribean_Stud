const API_URL = 'http://localhost:3001/api/messages';

export type FriendMessage = { messageId: number; senderId: number; recipientId: number; message: string; readAt: string | null; createdAt: string };

async function handle(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Message request failed.');
  return data;
}

export async function getConversation(friendId: number): Promise<FriendMessage[]> {
  return handle(await fetch(`${API_URL}/${friendId}`, { credentials: 'include' }));
}

export async function sendMessage(friendId: number, message: string): Promise<FriendMessage> {
  return handle(await fetch(`${API_URL}/${friendId}`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
  }));
}
