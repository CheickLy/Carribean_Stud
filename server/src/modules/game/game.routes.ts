import { Router } from "express";
import { dealTable } from "./deal.js";

export const gameRouter = Router();

gameRouter.get("/deal", (req, res) => {
  const userId = req.session?.userId;
  if (!Number.isInteger(userId) || !userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  res.json(dealTable());
});
