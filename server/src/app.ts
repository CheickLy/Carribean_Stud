import express from 'express';
import cors from 'cors';
import './models/index.js';
import { usersRouter } from './modules/users/users.routes.js';
import { tablesRouter } from "./modules/tables/tables.routes.js";

export const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/users', usersRouter);
app.use("/api/lobbies", tablesRouter);

