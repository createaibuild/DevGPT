import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { asyncHandler } from '../src/asyncHandler.js';

describe('asyncHandler', () => {
  it('forwards a rejected route to next', async () => {
    const error = new Error('db down');
    const wrapped = asyncHandler(async () => {
      throw error;
    });
    const next = (err) => {
      next.err = err;
    };

    await wrapped({}, {}, next);
    assert.equal(next.err, error);
  });

  it('does not call next when the route succeeds', async () => {
    let called = false;
    const wrapped = asyncHandler(async (_req, res) => {
      res.sent = true;
    });

    await wrapped({}, {}, () => {
      called = true;
    });
    assert.equal(called, false);
  });
});
