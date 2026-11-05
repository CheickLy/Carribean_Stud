const API_URL = '/api/support-tickets';

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export type SupportTicket = {
  ticketId: number;
  subject: string;
  message: string;
  status: TicketStatus;
  resolutionNote: string | null;
  createdAt: string;
  player: { username: string; email: string } | null;
};

async function readResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load support tickets');
  return data;
}

export async function listSupportTickets(): Promise<SupportTicket[]> {
  return readResponse(await fetch(API_URL, { credentials: 'include' }));
}

export async function saveSupportTicket(ticketId: number, status: TicketStatus, resolutionNote: string): Promise<SupportTicket> {
  return readResponse(await fetch(`${API_URL}/${ticketId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, resolutionNote }),
  }));
}

export async function submitSupportTicket(
  subject: string,
  message: string,
  replyContact: string
): Promise<{ ticketId: number; status: string; message: string }> {
  const response = await fetch(API_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject,
      message,
      replyContact,
    }),
  });

  return readResponse(response);
}