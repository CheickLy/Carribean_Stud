import express from 'express';
import cors from 'cors';
import './models/index.js';
import { usersRouter } from './modules/users/users.routes.js';
import { tablesRouter } from "./modules/tables/tables.routes.js";
import { friendsRouter } from './modules/friends/friends.routes.js';

import session from 'express-session';
import connectionSessionSequelize from 'connect-session-sequelize';
import {sequelize} from './db/sequelize.js';
import {authRouter} from './modules/auth/auth.routes.js';

const SequelizeStore = connectionSessionSequelize(session.Store);

const sessionStore = new SequelizeStore({
  db: sequelize,
});



export const app = express();


app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET required');
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(express.json());



app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/lobbies', tablesRouter);

void sessionStore.sync();
