import { Router } from 'express';
import { listUsers } from './users.service.js';

export const usersRouter = Router();

usersRouter.get('/', async (_req, res, next) => {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
});
