import { joinLobby, JoinError } from "./join.service.js";
import { Router } from "express";
import type { Request, Response } from "express";
import { User } from "../../models/user.js";
import { createLobby, getAllLobbies, getLobbies, getLobbyDetails } from "./tables.service.js";
import { validateLobby } from "./tables.validation.js";


export const tablesRouter = Router();

async function requireAdmin(req: Request, res: Response) {
  const userId = req.session?.userId;
  if (!Number.isInteger(userId) || !userId || userId <= 0) {
    res.status(401).json({ error: "Authentication required." });
    return false;
  }

  const user = await User.findByPk(userId);
  if (!user) {
    res.status(401).json({ error: "Authentication required." });
    return false;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "This account is disabled" });
    return false;
  }

  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return false;
  }

  return true;
}

tablesRouter.get("/all", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const lobbies = await getAllLobbies();

    res.status(200).json(lobbies);
  } catch (error) {
    next(error);
  }
});

tablesRouter.get("/", async (_req, res, next) => {
  try {
    const lobbies = await getLobbies();

    res.status(200).json(lobbies);
  } catch (error) {
    next(error);
  }
});

tablesRouter.get("/:lobbyId", async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) { res.status(401).json({ error: "Please sign in to view your table." }); return; }
    const id = Number(req.params.lobbyId);
    if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid table ID." }); return; }
    const lobby = await getLobbyDetails(id, userId);
    if (!lobby) { res.status(404).json({ error: "Table not found or you are not a member." }); return; }
    res.json(lobby);
  } catch (error) { next(error); }
});

tablesRouter.post("/", async (req, res, next) => {
  try {
    
    const errors = validateLobby(req.body);

    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

  
    const hostId = req.session.userId;

    if (typeof hostId !== "number" || !Number.isInteger(hostId) || hostId <= 0) {
      res.status(401).json({
        error: "You must be signed in to create a table.",
      });
      return;
    }


    const lobby = await createLobby(req.body, hostId);

    res.status(201).json(lobby);
  } catch (error) {
    next(error);
  }
});

// Session identity is authoritative; client-supplied user IDs and buy-in amounts are ignored.
tablesRouter.post("/:lobbyId/join", async (req, res, next) => {
  const userId = req.session?.userId;
  if (!Number.isSafeInteger(userId) || !userId || userId <= 0) { res.status(401).json({ error: "Please sign in to join a table." }); return; }
  const lobbyId = Number(req.params.lobbyId);
  const { passcode } = req.body ?? {};
  if (!Number.isSafeInteger(lobbyId) || lobbyId <= 0 || (passcode !== undefined && (typeof passcode !== "string" || passcode.length > 72))) {
    res.status(400).json({ error: "A valid table ID and password are required." }); return;
  }
  try { res.json(await joinLobby(lobbyId, userId, passcode)); }
  catch (error) {
    if (error instanceof JoinError) { res.status(error.status).json({ error: error.message }); return; }
    next(error);
  }
});
