import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import Conversation from '../src/models/Conversation.js';
import User from '../src/models/User.js';
import conversationRoutes from '../src/routes/conversations.js';

process.env.JWT_SECRET = 'test-secret';
delete process.env.GROQ_API_KEY;
delete process.env.OPENAI_API_KEY;

const userId = new mongoose.Types.ObjectId();
const token = jwt.sign({ id: String(userId) }, process.env.JWT_SECRET);

let found = null;
let listed = [];
let deletedCount = 0;

function makeDoc(title = 'New chat') {
  return {
    _id: new mongoose.Types.ObjectId(),
    title,
    messages: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    async save() {
      this.updatedAt = new Date('2026-01-02T00:00:00.000Z');
      return this;
    },
  };
}

mock.method(User, 'findById', async () => ({ _id: userId, name: 'Ada', email: 'ada@example.com' }));
mock.method(Conversation, 'findOne', async () => found);
mock.method(Conversation, 'find', () => ({
  sort() { return this; },
  select() { return this; },
  lean: async () => listed,
}));
mock.method(Conversation, 'deleteOne', async () => ({ deletedCount }));
mock.method(Conversation, 'create', async (data) => ({
  _id: new mongoose.Types.ObjectId(),
  title: data.title,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}));

function app() {
  const api = express();
  api.use(express.json());
  api.use('/api/conversations', conversationRoutes);
  return api;
}

function authed() {
  const api = request(app());
  const withToken = (method) => (path) => api[method](path).set('Authorization', `Bearer ${token}`);
  return {
    get: withToken('get'),
    post: withToken('post'),
    patch: withToken('patch'),
    delete: withToken('delete'),
  };
}

function frames(text) {
  return text.split('\n\n').filter((block) => block.includes('data:')).map((block) => {
    const line = block.split('\n').find((entry) => entry.startsWith('data:'));
    return JSON.parse(line.slice(5));
  });
}

describe('conversation routes', { concurrency: false }, () => {
  before(() => {
    found = null;
    listed = [];
    deletedCount = 0;
  });

  it('requires a token', async () => {
    const response = await request(app()).get('/api/conversations');
    assert.equal(response.status, 401);
    assert.equal(response.body.error, 'Please sign in.');
  });

  it('lists titles for the signed-in user and omits messages', async () => {
    listed = [{
      _id: new mongoose.Types.ObjectId(),
      title: 'Hello',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      messages: [{ role: 'user', content: 'secret' }],
    }];

    const response = await authed().get('/api/conversations');

    assert.equal(response.status, 200);
    assert.equal(response.body.conversations.length, 1);
    assert.equal(response.body.conversations[0].title, 'Hello');
    assert.equal(response.body.conversations[0].messages, undefined);
  });

  it('creates an empty chat titled New chat', async () => {
    const response = await authed().post('/api/conversations').send({});
    assert.equal(response.status, 201);
    assert.equal(response.body.conversation.title, 'New chat');
  });

  it('returns 404 for a bad id and for a chat the user does not own', async () => {
    found = null;
    const badId = await authed().get('/api/conversations/not-an-id');
    const missing = await authed().get(`/api/conversations/${new mongoose.Types.ObjectId()}`);

    assert.equal(badId.status, 404);
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error, 'Conversation not found.');
  });

  it('returns the saved messages for an owned chat', async () => {
    found = makeDoc('Hello');
    found.messages.push({
      _id: new mongoose.Types.ObjectId(),
      role: 'user',
      content: 'Hi',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const response = await authed().get(`/api/conversations/${found._id}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.conversation.messages[0].content, 'Hi');
    assert.equal(response.body.conversation.messages[0].role, 'user');
  });

  it('renames within 1 to 80 characters', async () => {
    found = makeDoc('Old');
    const renamed = await authed().patch(`/api/conversations/${found._id}`).send({ title: '  Renamed chat  ' });
    const blank = await authed().patch(`/api/conversations/${found._id}`).send({ title: '   ' });
    const tooLong = await authed().patch(`/api/conversations/${found._id}`).send({ title: 'x'.repeat(81) });

    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.conversation.title, 'Renamed chat');
    assert.equal(blank.status, 400);
    assert.equal(tooLong.status, 400);
  });

  it('deletes only when a document matched the owner', async () => {
    deletedCount = 0;
    const missing = await authed().delete(`/api/conversations/${new mongoose.Types.ObjectId()}`);
    deletedCount = 1;
    const removed = await authed().delete(`/api/conversations/${new mongoose.Types.ObjectId()}`);

    assert.equal(missing.status, 404);
    assert.equal(removed.status, 200);
    assert.equal(removed.body.ok, true);
  });

  it('rejects an empty or oversized message before streaming', async () => {
    found = makeDoc();
    const empty = await authed().post(`/api/conversations/${found._id}/messages`).send({ content: '   ' });
    const huge = await authed().post(`/api/conversations/${found._id}/messages`).send({ content: 'x'.repeat(8001) });

    assert.equal(empty.status, 400);
    assert.equal(huge.status, 400);
    assert.equal(found.messages.length, 0);
  });

  it('saves the user message first, titles the chat, and streams a demo reply', async () => {
    found = makeDoc();
    const content = `${'a'.repeat(42)}b`;
    const response = await authed().post(`/api/conversations/${found._id}/messages`).send({ content });
    const events = frames(response.text);
    const done = events.find((event) => event.done);

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /text\/event-stream/);
    assert.equal(found.messages[0].role, 'user');
    assert.equal(found.messages[0].content, content);
    assert.equal(events[0].title, `${'a'.repeat(42)}…`);
    assert.equal(found.messages.at(-1).role, 'assistant');
    assert.match(found.messages.at(-1).content, /### Highlights/);
    assert.equal(done.demo, true);
    assert.equal(done.provider, 'demo');
  });
});
