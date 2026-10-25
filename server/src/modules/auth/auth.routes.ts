import crypto from 'node:crypto';

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Op, UniqueConstraintError } from 'sequelize';
import { User } from '../../models/user.js';

export const authRouter = Router();

const STARTING_CHIPS = '500.00';
const userDTO = (u: User) => ({
  userId: u.userId, username: u.username, role: u.role,
  isGuest: u.isGuest, balance: u.balance,
  email: u.isGuest ? null : u.email
});

authRouter.post('/guest', async (req, res) => {
  try {
    if (req.session.userId) {
      const current = await User.findByPk(req.session.userId);
      if (current && !current.isBanned) {
        res.json({ message: 'Session already active', user: userDTO(current) });
        return;
      }
      req.session.userId = undefined;
    }
    const id = crypto.randomUUID();
    const guest = await User.create({
      username: 'guest_' + id, email: 'guest_' + id + '@guest.reefroyale.invalid',
      passwordHash: crypto.randomUUID(), role: 'player', isGuest: true,
      isBanned: false, topupCount: 0, balance: STARTING_CHIPS
    });
    req.session.regenerate((error) => {
      if (error) { res.status(500).json({ error: 'Could not establish session' }); return; }
      req.session.userId = guest.userId;
      req.session.save((saveError) => {
        if (saveError) { res.status(500).json({ error: 'Could not save session' }); return; }
        res.status(201).json({ message: 'Guest session started', user: userDTO(guest) });
      });
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'Could not create guest' });
  }
});


authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ error: 'This account is disabled' });
      return;
    }

    req.session.userId = user.userId;

    res.json({
      message: 'Login successful',
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.get('/me', async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const user = await User.findByPk(req.session.userId);

  if (!user || user.isBanned) {
    req.session.destroy(() => {});
    res.status(401).json({ error: 'Session no longer valid' });
    return;
  }

  res.json({
    user: {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role,
      balance: user.balance,
    },
  });
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      res.status(500).json({ error: 'Could not log out' });
      return;
    }

    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

authRouter.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body ?? {};

    
    if (
      typeof username !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      res.status(400).json({
        error: 'Username, email, and password are required',
      });
      return;
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      res.status(400).json({
        error: 'Username must be 3-30 characters and contain only letters, numbers, or underscores',
      });
      return;
    }

    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({
        error: 'Enter a valid email address',
      });
      return;
    }

    
    if (password.length < 8 || password.length > 72) {
      res.status(400).json({
        error: 'Password must be between 8 and 72 characters',
      });
      return;
    }

    
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: cleanUsername },
          { email: cleanEmail },
        ],
      },
    });

    if (existingUser) {
      res.status(409).json({
        error: 'Username or email already registered',
      });
      return;
    }

    
    const passwordHash = await bcrypt.hash(password, 12);

    
    const current = req.session.userId
      ? await User.findByPk(req.session.userId) : null;

    if (current?.isBanned) {
      res.status(403).json({ error: 'This account is disabled' });
      return;
    }

    // Convert guest in place: same ID, virtual chips and game associations.
    const user = current?.isGuest
      ? await current.update({
          username: cleanUsername, email: cleanEmail,
          passwordHash, role: 'player', isGuest: false
        })
      : await User.create({
          username: cleanUsername, email: cleanEmail,
          passwordHash, role: 'player', isGuest: false,
          isBanned: false, topupCount: 0, balance: '0.00'
        });

    res.status(201).json({
      message: 'Registration successful',
      user: userDTO(user)
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      res.status(409).json({
        error: 'Username or email already registered',
      });
      return;
    }

    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

