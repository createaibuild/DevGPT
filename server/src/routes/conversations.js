import { Router } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import { asyncHandler } from '../asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { providerConfig, streamAssistant, usingDemo } from '../services/ai.js';

const router = Router();

router.use(requireAuth);

function presentSummary(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function presentMessage(message) {
  return {
    id: String(message._id),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  };
}

function presentFull(doc) {
  return {
    ...presentSummary(doc),
    messages: (doc.messages || []).map(presentMessage),
  };
}

function makeTitle(content) {
  const clean = content.replace(/\s+/g, ' ').trim();
  if (!clean) return 'New chat';
  if (clean.length <= 42) return clean;
  return `${clean.slice(0, 42).trimEnd()}…`;
}

async function findOwned(userId, id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Conversation.findOne({ _id: id, user: userId });
}

router.get('/', asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ user: req.user._id })
    .sort({ updatedAt: -1 })
    .select('title createdAt updatedAt')
    .lean();

  res.json({ conversations: conversations.map(presentSummary) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const conversation = await Conversation.create({
    user: req.user._id,
    title: 'New chat',
    messages: [],
  });
  res.status(201).json({ conversation: presentSummary(conversation) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const conversation = await findOwned(req.user._id, req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
  return res.json({ conversation: presentFull(conversation) });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const conversation = await findOwned(req.user._id, req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });

  const title = typeof req.body?.title === 'string'
    ? req.body.title.replace(/\s+/g, ' ').trim()
    : '';

  if (!title || title.length > 80) {
    return res.status(400).json({ error: 'Title must be 1–80 characters.' });
  }

  conversation.title = title;
  await conversation.save();
  return res.json({ conversation: presentSummary(conversation) });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  const result = await Conversation.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!result.deletedCount) return res.status(404).json({ error: 'Conversation not found.' });
  return res.json({ ok: true });
}));

router.post('/:id/messages', asyncHandler(async (req, res) => {
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!content) return res.status(400).json({ error: 'Message is empty.' });
  if (content.length > 8000) {
    return res.status(400).json({ error: 'Message is too long (max 8000 characters).' });
  }

  const conversation = await findOwned(req.user._id, req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });

  const isFirst = conversation.messages.length === 0;
  conversation.messages.push({ role: 'user', content });
  if (isFirst || conversation.title === 'New chat') {
    conversation.title = makeTitle(content);
  }
  await conversation.save();

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  let closed = false;
  const abort = new AbortController();
  const send = (payload) => {
    if (closed || res.writableEnded) return;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  res.on('close', () => {
    if (!res.writableEnded) {
      closed = true;
      abort.abort();
    }
  });

  send({
    conversationId: String(conversation._id),
    title: conversation.title,
    updatedAt: conversation.updatedAt,
  });

  let full = '';
  let stored = false;

  async function storeAssistant() {
    if (stored || !full.trim()) return;
    stored = true;
    conversation.messages.push({ role: 'assistant', content: full.slice(0, 20000) });
    await conversation.save();
  }

  try {
    const history = conversation.messages.slice(-12).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    await streamAssistant({
      messages: history,
      signal: abort.signal,
      onToken(token) {
        full += token;
        send({ token });
      },
    });

    await storeAssistant();

    if (!closed) {
      send({
        done: true,
        demo: usingDemo(),
        provider: providerConfig()?.name || 'demo',
        title: conversation.title,
      });
      res.end();
    }
  } catch (err) {
    if (err.name === 'AbortError' || closed) {
      await storeAssistant().catch((saveErr) => console.error(saveErr));
      return;
    }

    console.error(err);
    await storeAssistant().catch((saveErr) => console.error(saveErr));
    send({ error: err.message || 'The reply stopped early. Please try again.' });
    if (!res.writableEnded) res.end();
  }
}));

export default router;
