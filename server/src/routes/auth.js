import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { toPublic } from '../models/User.js';
import { asyncHandler } from '../asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();
const limitAuth = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

function sign(user) {
  const token = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { token, user: toPublic(user) };
}

function readName(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function readEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

router.post('/register', limitAuth, asyncHandler(async (req, res) => {
  const name = readName(req.body?.name);
  const email = readEmail(req.body?.email);
  const password = req.body?.password;
  const theme = req.body?.theme === 'light' ? 'light' : 'dark';

  if (!name || name.length > 80) {
    return res.status(400).json({ error: 'Name must be 1–80 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
    return res.status(400).json({ error: 'Password must be 6–100 characters.' });
  }

  const existing = await User.findOne({ email }).select('_id');
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  try {
    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      settings: { theme },
    });
    return res.status(201).json(sign(user));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    throw err;
  }
}));

router.post('/login', limitAuth, asyncHandler(async (req, res) => {
  const email = readEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await User.findOne({ email }).select('+password');
  const matches = user ? await bcrypt.compare(password, user.password) : false;
  if (!user || !matches) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  return res.json(sign(user));
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublic(req.user) });
});

router.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const update = {};

  if (typeof req.body?.name === 'string') {
    const name = readName(req.body.name);
    if (!name || name.length > 80) {
      return res.status(400).json({ error: 'Name must be 1–80 characters.' });
    }
    update.name = name;
  }

  if (typeof req.body?.theme === 'string') {
    if (!['light', 'dark'].includes(req.body.theme)) {
      return res.status(400).json({ error: 'Theme must be light or dark.' });
    }
    update['settings.theme'] = req.body.theme;
  }

  if (!Object.keys(update).length) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
  return res.json({ user: toPublic(user) });
}));

export default router;
