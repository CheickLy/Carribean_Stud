
import { Router } from 'express';
import bcrypt from 'bcryptjs';
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
