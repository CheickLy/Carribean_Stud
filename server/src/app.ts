import express from 'express';
import cors from 'cors';
import './models/index.js';
import { usersRouter } from './modules/users/users.routes.js';

export const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/users', usersRouter);

