
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Op, UniqueConstraintError } from 'sequelize';
import { User } from '../../models/user.js';

export const authRouter = Router();

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

    
    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      role: 'player',
      isGuest: false,
      isBanned: false,
      topupCount: 0,
      balance: '0.00',
    });

    
    res.status(201).json({
      message: 'Registration successful',
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
      },
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

