import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { rateLimit } from '../src/middleware/rateLimit.js';

function appWithLimit(options) {
  const app = express();
  app.set('trust proxy', false);
  app.get('/limited', rateLimit(options), (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('rateLimit', () => {
  it('allows requests up to the max, then returns 429', async () => {
    const app = appWithLimit({ windowMs: 60_000, max: 2 });

    const first = await request(app).get('/limited');
    const second = await request(app).get('/limited');
    const third = await request(app).get('/limited');

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 429);
    assert.equal(third.body.error, 'Too many attempts. Please wait a few minutes.');
  });

  it('counts each IP separately', async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.get('/limited', rateLimit({ windowMs: 60_000, max: 1 }), (_req, res) => {
      res.json({ ok: true });
    });

    const first = await request(app).get('/limited').set('X-Forwarded-For', '203.0.113.10');
    const secondIp = await request(app).get('/limited').set('X-Forwarded-For', '203.0.113.11');
    const repeat = await request(app).get('/limited').set('X-Forwarded-For', '203.0.113.10');

    assert.equal(first.status, 200);
    assert.equal(secondIp.status, 200);
    assert.equal(repeat.status, 429);
  });

  it('lets a new request through after the window passes', async () => {
    const app = appWithLimit({ windowMs: 30, max: 1 });
    const first = await request(app).get('/limited');
    const again = await request(app).get('/limited');
    await new Promise((resolve) => setTimeout(resolve, 45));
    const after = await request(app).get('/limited');

    assert.equal(first.status, 200);
    assert.equal(again.status, 429);
    assert.equal(after.status, 200);
  });
});
