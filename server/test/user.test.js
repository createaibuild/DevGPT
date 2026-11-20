import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toPublic } from '../src/models/User.js';

describe('toPublic', () => {
  it('returns id, name, email, and theme, and leaves the password out', () => {
    const user = toPublic({
      _id: 'abc123',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'hashed-secret',
      settings: { theme: 'light' },
    });

    assert.deepEqual(user, {
      id: 'abc123',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      settings: { theme: 'light' },
    });
    assert.equal('password' in user, false);
  });

  it('defaults a missing theme to dark', () => {
    const user = toPublic({ _id: 'abc123', name: 'Ada', email: 'ada@example.com' });
    assert.equal(user.settings.theme, 'dark');
  });
});
