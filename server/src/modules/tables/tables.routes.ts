import { Router } from "express";
import { createLobby, getAllLobbies, getPublicLobbies } from "./tables.service.js";
import { validateLobby } from "./tables.validation.js";


export const tablesRouter = Router();

tablesRouter.get("/all", async (_req, res, next) => {
  try {
    const lobbies = await getAllLobbies();

    res.status(200).json(lobbies);
  } catch (error) {
    next(error);
  }
});

tablesRouter.get("/", async (_req, res, next) => {
  try {
    const lobbies = await getPublicLobbies();

    res.status(200).json(lobbies);
  } catch (error) {
    next(error);
  }
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
