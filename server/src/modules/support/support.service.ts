import { SupportTicket } from '../../models/supportTicket.js';
import { User } from '../../models/user.js';

export const ticketStatuses = ['open', 'in_progress', 'resolved'] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export async function listTickets() {
  const tickets = await SupportTicket.findAll({
    include: [{ model: User, as: 'user', attributes: ['username', 'email'] }],
    order: [['createdAt', 'DESC'], ['ticketId', 'DESC']],
  });
  return tickets.map((ticket) => formatTicket(ticket));
}

export async function updateTicket(ticketId: number, status: TicketStatus, resolutionNote: string | null) {
  const ticket = await SupportTicket.findByPk(ticketId);
  if (!ticket) return null;
  await ticket.update({ status, resolutionNote });
  const updated = await SupportTicket.findByPk(ticketId, {
    include: [{ model: User, as: 'user', attributes: ['username', 'email'] }],
  });
  return updated ? formatTicket(updated) : null;
}

function formatTicket(ticket: SupportTicket) {
  const player = ticket.get('user') as User | null;
  return {
    ticketId: ticket.ticketId,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    resolutionNote: ticket.resolutionNote,
    createdAt: ticket.createdAt,
    player: player ? { username: player.username, email: player.email } : null,
  };
}
