import { Router } from "express";
import {
  sendLobbyInvitation,
  getIncomingInvitations,
  respondToLobbyInvitation,
} from "./invitations.service.js";

export const invitationsRouter = Router();

invitationsRouter.use((req, res, next) => {
  const userId = req.session?.userId;

  if (!Number.isInteger(userId) || !userId || userId <= 0) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  res.locals.userId = userId;
  next();
});

invitationsRouter.post("/", async (req, res) => {
  try {
    const senderId = res.locals.userId;
    const { recipientId, lobbyId } = req.body;

    if (
      !Number.isInteger(recipientId) ||
      recipientId <= 0 ||
      !Number.isInteger(lobbyId) ||
      lobbyId <= 0
    ) {
      res.status(400).json({
        error: "Valid recipientId and lobbyId are required.",
      });
      return;
    }

    const invitation = await sendLobbyInvitation(
      senderId,
      recipientId,
      lobbyId
    );

    res.status(201).json(invitation);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send invitation.";

    res.status(400).json({ error: message });
  }
});

invitationsRouter.get("/", async (_req, res) => {
  try {
    const userId = res.locals.userId;
    const invitations = await getIncomingInvitations(userId);

    res.status(200).json(invitations);
  } catch {
    res.status(500).json({
      error: "Failed to retrieve invitations.",
    });
  }
});

invitationsRouter.patch("/:id", async (req, res) => {
  try {
    const userId = res.locals.userId;
    const invitationId = Number(req.params.id);
    const { action } = req.body;

    if (!Number.isInteger(invitationId) || invitationId <= 0) {
      res.status(400).json({ error: "Invalid invitation ID." });
      return;
    }

    if (action !== "accept" && action !== "decline") {
      res.status(400).json({
        error: "Action must be accept or decline.",
      });
      return;
    }

    const invitation = await respondToLobbyInvitation(
      userId,
      invitationId,
      action
    );

    res.status(200).json(invitation);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to respond.";

    res.status(400).json({ error: message });
  }
});