import { Router } from "express";
import { createLobby, getLobbies, getLobbyDetails } from "./tables.service.js";
import { validateLobby } from "./tables.validation.js";


export const tablesRouter = Router();

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
