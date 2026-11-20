import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import User from '../src/models/User.js';
import authRoutes from '../src/routes/auth.js';

process.env.JWT_SECRET = 'test-secret';

const userId = new mongoose.Types.ObjectId();
const passwordHash = await bcrypt.hash('secret12', 4);

let lookup = null;
let created = null;

mock.method(User, 'findOne', () => ({
  select: async () => lookup,
}));

mock.method(User, 'findById', async () => lookup);

mock.method(User, 'create', async (data) => {
  created = data;
  return {
    _id: userId,
    name: data.name,
    email: data.email,
    settings: data.settings,
  };
});

mock.method(User, 'findByIdAndUpdate', async (_id, update) => ({
  _id: userId,
  name: update.name || 'Ada',
  email: 'ada@example.com',
  settings: { theme: update['settings.theme'] || 'dark' },
}));

function app() {
  const api = express();
  api.use(express.json());
  api.use('/api/auth', authRoutes);
  return api;
}

describe('auth routes', { concurrency: false }, () => {
  before(() => {
    lookup = null;
    created = null;
  });

  it('rejects a register body that fails validation', async () => {
    const api = app();
    const missingName = await request(api).post('/api/auth/register').send({
      name: '   ',
      email: 'ada@example.com',
      password: 'secret12',
    });
    const badEmail = await request(api).post('/api/auth/register').send({
      name: 'Ada',
      email: 'not-an-email',
      password: 'secret12',
    });
    const shortPassword = await request(api).post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'short',
    });

    assert.equal(missingName.status, 400);
    assert.equal(badEmail.status, 400);
    assert.equal(shortPassword.status, 400);
  });

  it('returns 409 when the email is already registered', async () => {
    lookup = { _id: userId };
    const response = await request(app()).post('/api/auth/register').send({
      name: 'Ada',
      email: 'Ada@Example.com',
      password: 'secret12',
    });

    assert.equal(response.status, 409);
    assert.equal(response.body.error, 'An account with that email already exists.');
  });

  it('creates an account, stores a hash, and returns a token', async () => {
    lookup = null;
    const response = await request(app()).post('/api/auth/register').send({
      name: '  Ada   Lovelace  ',
      email: 'Ada@Example.com',
      password: 'secret12',
      theme: 'light',
    });

    assert.equal(response.status, 201);
    assert.equal(created.name, 'Ada Lovelace');
    assert.equal(created.email, 'ada@example.com');
    assert.equal(created.settings.theme, 'light');
    assert.notEqual(created.password, 'secret12');
    assert.equal(await bcrypt.compare('secret12', created.password), true);
    assert.equal(response.body.user.email, 'ada@example.com');
    assert.equal(jwt.verify(response.body.token, process.env.JWT_SECRET).id, String(userId));
  });

  it('uses the same error for an unknown email and a wrong password', async () => {
    lookup = null;
    const unknown = await request(app()).post('/api/auth/login').send({
      email: 'missing@example.com',
      password: 'secret12',
    });

    lookup = {
      _id: userId,
      name: 'Ada',
      email: 'ada@example.com',
      password: passwordHash,
      settings: { theme: 'dark' },
    };
    const wrong = await request(app()).post('/api/auth/login').send({
      email: 'ada@example.com',
      password: 'nope-nope',
    });

    assert.equal(unknown.status, 401);
    assert.equal(wrong.status, 401);
    assert.equal(unknown.body.error, 'Email or password is incorrect.');
    assert.equal(wrong.body.error, unknown.body.error);
  });

  it('returns a token for a matching password', async () => {
    lookup = {
      _id: userId,
      name: 'Ada',
      email: 'ada@example.com',
      password: passwordHash,
      settings: { theme: 'dark' },
    };
    const response = await request(app()).post('/api/auth/login').send({
      email: 'ada@example.com',
      password: 'secret12',
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.name, 'Ada');
    assert.equal(response.body.user.password, undefined);
    assert.ok(response.body.token);
  });

  it('requires a token for the current user', async () => {
    const response = await request(app()).get('/api/auth/me');
    assert.equal(response.status, 401);
    assert.equal(response.body.error, 'Please sign in.');
  });

  it('returns the public user for a valid token', async () => {
    lookup = {
      _id: userId,
      name: 'Ada',
      email: 'ada@example.com',
      settings: { theme: 'light' },
    };
    const token = jwt.sign({ id: String(userId) }, process.env.JWT_SECRET);
    const response = await request(app()).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, 'ada@example.com');
    assert.equal(response.body.user.settings.theme, 'light');
  });

  it('updates name and theme, and rejects an empty or invalid patch', async () => {
    lookup = {
      _id: userId,
      name: 'Ada',
      email: 'ada@example.com',
      settings: { theme: 'dark' },
    };
    const token = jwt.sign({ id: String(userId) }, process.env.JWT_SECRET);
    const api = app();
    const headers = { Authorization: `Bearer ${token}` };

    const empty = await request(api).patch('/api/auth/me').set(headers).send({});
    const badTheme = await request(api).patch('/api/auth/me').set(headers).send({ theme: 'blue' });
    const renamed = await request(api).patch('/api/auth/me').set(headers).send({ name: 'Ada L', theme: 'light' });

    assert.equal(empty.status, 400);
    assert.equal(badTheme.status, 400);
    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.user.name, 'Ada L');
    assert.equal(renamed.body.user.settings.theme, 'light');
  });
});
